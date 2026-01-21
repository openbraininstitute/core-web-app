/**
 * SSE Client for System Messages
 *
 * Manages Server-Sent Events connection for real-time message updates.
 * Implements reconnection with exponential backoff, tab synchronization via BroadcastChannel,
 * and fallback polling when SSE is unavailable.
 *
 * @module api/sse-client
 */

import {
  BROADCAST_CHANNEL_NAME,
  POLLING_INTERVAL,
  SSE_HEARTBEAT_TIMEOUT,
  SSE_RECONNECT_INITIAL_DELAY,
  SSE_RECONNECT_MAX_DELAY,
} from "../constants";
import type {
  ISSEClientCallbacks,
  ISSEClientConfig,
  ISSEEvent,
  ISystemMessage,
  TConnectionStatus,
  TSSEEventType,
} from "../types";

// ============================================================================
// BroadcastChannel Message Types
// ============================================================================

/**
 * Message types for cross-tab communication via BroadcastChannel.
 */
type TBroadcastMessageType =
  | "leader-election"
  | "leader-heartbeat"
  | "leader-resign"
  | "sse-event"
  | "request-leader";

/**
 * BroadcastChannel message structure.
 */
interface IBroadcastMessage {
  type: TBroadcastMessageType;
  tabId: string;
  timestamp: number;
  payload?: ISSEEvent | null;
}

// ============================================================================
// SSE Client Class
// ============================================================================

/**
 * Default SSE client configuration.
 */
const DEFAULT_CONFIG: ISSEClientConfig = {
  url: "/api/system-messages/stream",
  reconnectDelay: SSE_RECONNECT_INITIAL_DELAY,
  maxReconnectDelay: SSE_RECONNECT_MAX_DELAY,
  heartbeatTimeout: SSE_HEARTBEAT_TIMEOUT,
};

/**
 * SSE Client for real-time system message updates.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Tab synchronization via BroadcastChannel (leader election)
 * - Fallback polling when SSE is disconnected
 * - Heartbeat monitoring for connection health
 */
export class SSEClient {
  private config: ISSEClientConfig;
  private callbacks: ISSEClientCallbacks;

  // Connection state
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private lastEventId: string | null = null;

  // Timers
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  // Tab synchronization
  private broadcastChannel: BroadcastChannel | null = null;
  private tabId: string;
  private isLeader = false;
  private leaderHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private leaderCheckTimer: ReturnType<typeof setTimeout> | null = null;

  // State flags
  private isConnecting = false;
  private isDisconnecting = false;
  private currentStatus: TConnectionStatus = "disconnected";

  /**
   * Creates a new SSE client instance.
   *
   * @param config - SSE client configuration (optional, uses defaults)
   * @param callbacks - Event callbacks for message handling and status changes
   */
  constructor(
    callbacks: ISSEClientCallbacks,
    config: Partial<ISSEClientConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
    this.tabId = this.generateTabId();

    // Initialize BroadcastChannel for tab synchronization
    this.initBroadcastChannel();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Establishes SSE connection.
   * If this tab is not the leader, it will participate in leader election.
   *
   * @param lastEventId - Optional last event ID for resumption
   */
  connect(lastEventId?: string): void {
    if (this.isConnecting || this.isDisconnecting) {
      return;
    }

    if (lastEventId) {
      this.lastEventId = lastEventId;
    }

    // Start leader election process
    this.requestLeadership();
  }

  /**
   * Disconnects the SSE connection and cleans up all resources.
   */
  disconnect(): void {
    this.isDisconnecting = true;

    // Resign leadership if we're the leader
    if (this.isLeader) {
      this.resignLeadership();
    }

    // Close SSE connection
    this.closeEventSource();

    // Clear all timers
    this.clearAllTimers();

    // Close BroadcastChannel
    this.closeBroadcastChannel();

    // Update status
    this.updateStatus("disconnected");

    this.isDisconnecting = false;
  }

  /**
   * Returns the current connection status.
   */
  getStatus(): TConnectionStatus {
    return this.currentStatus;
  }

  /**
   * Returns whether this tab is the leader.
   */
  getIsLeader(): boolean {
    return this.isLeader;
  }

  /**
   * Returns the last received event ID.
   */
  getLastEventId(): string | null {
    return this.lastEventId;
  }

  // ============================================================================
  // SSE Connection Management
  // ============================================================================

  /**
   * Establishes the actual SSE connection.
   * Only called when this tab is the leader.
   */
  private establishConnection(): void {
    if (this.eventSource || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.updateStatus("reconnecting");

    try {
      // Build URL with last event ID if available
      let url = this.config.url;
      if (this.lastEventId) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}lastEventId=${encodeURIComponent(this.lastEventId)}`;
      }

      this.eventSource = new EventSource(url);

      // Set up event listeners
      this.eventSource.onopen = this.handleOpen.bind(this);
      this.eventSource.onerror = this.handleError.bind(this);

      // Listen for specific event types
      this.eventSource.addEventListener(
        "message",
        this.handleMessageEvent.bind(this),
      );
      this.eventSource.addEventListener(
        "update",
        this.handleUpdateEvent.bind(this),
      );
      this.eventSource.addEventListener(
        "delete",
        this.handleDeleteEvent.bind(this),
      );
      this.eventSource.addEventListener(
        "heartbeat",
        this.handleHeartbeatEvent.bind(this),
      );
    } catch (error) {
      this.isConnecting = false;
      this.handleConnectionError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Handles successful SSE connection open.
   */
  private handleOpen(): void {
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.updateStatus("connected");
    this.startHeartbeatMonitor();

    // Stop fallback polling since SSE is connected
    this.stopPolling();
  }

  /**
   * Handles SSE connection errors.
   */
  private handleError(): void {
    this.isConnecting = false;

    // EventSource automatically reconnects, but we want to control the backoff
    this.closeEventSource();
    this.updateStatus("reconnecting");

    // Schedule reconnection with exponential backoff
    this.scheduleReconnect();

    // Start fallback polling while disconnected
    this.startPolling();
  }

  /**
   * Handles connection errors (non-SSE errors).
   */
  private handleConnectionError(error: Error): void {
    this.callbacks.onError?.(error);
    this.scheduleReconnect();
    this.startPolling();
  }

  /**
   * Closes the EventSource connection.
   */
  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.stopHeartbeatMonitor();
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handles 'message' SSE events (new message).
   */
  private handleMessageEvent(event: MessageEvent): void {
    this.processSSEEvent("message", event);
  }

  /**
   * Handles 'update' SSE events (message updated).
   */
  private handleUpdateEvent(event: MessageEvent): void {
    this.processSSEEvent("update", event);
  }

  /**
   * Handles 'delete' SSE events (message deleted).
   */
  private handleDeleteEvent(event: MessageEvent): void {
    this.processSSEEvent("delete", event);
  }

  /**
   * Handles 'heartbeat' SSE events (connection health check).
   */
  private handleHeartbeatEvent(event: MessageEvent): void {
    this.processSSEEvent("heartbeat", event);
    this.resetHeartbeatMonitor();
  }

  /**
   * Processes an SSE event and broadcasts to other tabs.
   */
  private processSSEEvent(type: TSSEEventType, event: MessageEvent): void {
    try {
      let data: ISystemMessage | { id: string } | null = null;

      if (event.data && type !== "heartbeat") {
        data = JSON.parse(event.data);
      }

      const sseEvent: ISSEEvent = {
        type,
        data,
        id: event.lastEventId || this.generateEventId(),
        timestamp: new Date().toISOString(),
      };

      // Update last event ID
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
      }

      // Notify callback
      this.callbacks.onMessage(sseEvent);

      // Broadcast to other tabs
      this.broadcastEvent(sseEvent);
    } catch (error) {
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error("Failed to parse SSE event"),
      );
    }
  }

  // ============================================================================
  // Reconnection with Exponential Backoff
  // ============================================================================

  /**
   * Schedules a reconnection attempt with exponential backoff.
   * Formula: delay = min(initialDelay * 2^attempts, maxDelay)
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.isLeader) {
      return;
    }

    const delay = Math.min(
      this.config.reconnectDelay * 2 ** this.reconnectAttempts,
      this.config.maxReconnectDelay,
    );

    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isLeader && !this.eventSource) {
        this.establishConnection();
      }
    }, delay);
  }

  /**
   * Cancels any pending reconnection attempt.
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ============================================================================
  // Heartbeat Monitoring
  // ============================================================================

  /**
   * Starts the heartbeat monitor.
   * If no heartbeat is received within the timeout, the connection is considered dead.
   */
  private startHeartbeatMonitor(): void {
    this.stopHeartbeatMonitor();
    this.heartbeatTimer = setTimeout(() => {
      // No heartbeat received, connection is dead
      this.handleError();
    }, this.config.heartbeatTimeout);
  }

  /**
   * Resets the heartbeat monitor timer.
   */
  private resetHeartbeatMonitor(): void {
    this.startHeartbeatMonitor();
  }

  /**
   * Stops the heartbeat monitor.
   */
  private stopHeartbeatMonitor(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ============================================================================
  // Fallback Polling
  // ============================================================================

  /**
   * Starts fallback polling when SSE is disconnected.
   * Polls every POLLING_INTERVAL milliseconds.
   */
  private startPolling(): void {
    if (this.pollingTimer || !this.isLeader) {
      return;
    }

    this.pollingTimer = setInterval(() => {
      this.pollMessages();
    }, POLLING_INTERVAL);

    // Also poll immediately
    this.pollMessages();
  }

  /**
   * Stops fallback polling.
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Polls for messages via HTTP.
   * This is a fallback mechanism when SSE is unavailable.
   */
  private async pollMessages(): Promise<void> {
    try {
      let url = this.config.url.replace("/stream", "");
      if (this.lastEventId) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}since=${encodeURIComponent(this.lastEventId)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status}`);
      }

      const messages: ISystemMessage[] = await response.json();

      // Process each message as an SSE event
      for (const message of messages) {
        const sseEvent: ISSEEvent = {
          type: "message",
          data: message,
          id: message.id,
          timestamp: new Date().toISOString(),
        };

        this.callbacks.onMessage(sseEvent);
        this.broadcastEvent(sseEvent);
      }

      // Update last event ID if we got messages
      if (messages.length > 0) {
        this.lastEventId = messages[messages.length - 1].id;
      }
    } catch (error) {
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error("Polling failed"),
      );
    }
  }

  // ============================================================================
  // Tab Synchronization via BroadcastChannel
  // ============================================================================

  /**
   * Initializes the BroadcastChannel for cross-tab communication.
   */
  private initBroadcastChannel(): void {
    if (typeof BroadcastChannel === "undefined") {
      // BroadcastChannel not supported, this tab will be standalone
      this.isLeader = true;
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.broadcastChannel.onmessage = this.handleBroadcastMessage.bind(this);
    } catch {
      // BroadcastChannel failed, this tab will be standalone
      this.isLeader = true;
    }
  }

  /**
   * Closes the BroadcastChannel.
   */
  private closeBroadcastChannel(): void {
    this.stopLeaderHeartbeat();
    this.cancelLeaderCheck();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }

  /**
   * Handles incoming BroadcastChannel messages.
   */
  private handleBroadcastMessage(event: MessageEvent<IBroadcastMessage>): void {
    const message = event.data;

    switch (message.type) {
      case "leader-election":
        this.handleLeaderElection(message);
        break;
      case "leader-heartbeat":
        this.handleLeaderHeartbeat(message);
        break;
      case "leader-resign":
        this.handleLeaderResign(message);
        break;
      case "sse-event":
        this.handleBroadcastedEvent(message);
        break;
      case "request-leader":
        this.handleLeaderRequest(message);
        break;
    }
  }

  /**
   * Requests leadership by broadcasting an election message.
   */
  private requestLeadership(): void {
    if (!this.broadcastChannel) {
      // No BroadcastChannel, become leader immediately
      this.becomeLeader();
      return;
    }

    // Broadcast election request
    this.broadcast({
      type: "leader-election",
      tabId: this.tabId,
      timestamp: Date.now(),
    });

    // Wait for responses, then decide
    this.leaderCheckTimer = setTimeout(() => {
      // No objections received, become leader
      if (!this.isLeader) {
        this.becomeLeader();
      }
    }, 100);
  }

  /**
   * Handles leader election messages from other tabs.
   */
  private handleLeaderElection(message: IBroadcastMessage): void {
    if (this.isLeader) {
      // We're already the leader, send heartbeat to assert leadership
      this.sendLeaderHeartbeat();
    } else if (message.tabId < this.tabId) {
      // Lower tab ID wins, cancel our election
      this.cancelLeaderCheck();
    }
  }

  /**
   * Handles leader heartbeat messages.
   */
  private handleLeaderHeartbeat(message: IBroadcastMessage): void {
    if (message.tabId !== this.tabId) {
      // Another tab is the leader
      this.cancelLeaderCheck();
      if (this.isLeader) {
        this.resignLeadership();
      }
      // Reset leader timeout
      this.startLeaderTimeout();
    }
  }

  /**
   * Handles leader resignation messages.
   */
  private handleLeaderResign(_message: IBroadcastMessage): void {
    // Leader resigned, start election
    this.requestLeadership();
  }

  /**
   * Handles leader request messages (from new tabs).
   */
  private handleLeaderRequest(_message: IBroadcastMessage): void {
    if (this.isLeader) {
      this.sendLeaderHeartbeat();
    }
  }

  /**
   * Handles SSE events broadcasted from the leader tab.
   */
  private handleBroadcastedEvent(message: IBroadcastMessage): void {
    if (!this.isLeader && message.payload) {
      // Update last event ID
      this.lastEventId = message.payload.id;
      // Notify callback
      this.callbacks.onMessage(message.payload);
    }
  }

  /**
   * Becomes the leader tab.
   */
  private becomeLeader(): void {
    this.isLeader = true;
    this.startLeaderHeartbeat();
    this.establishConnection();
  }

  /**
   * Resigns leadership.
   */
  private resignLeadership(): void {
    this.isLeader = false;
    this.stopLeaderHeartbeat();
    this.closeEventSource();
    this.stopPolling();

    // Broadcast resignation
    this.broadcast({
      type: "leader-resign",
      tabId: this.tabId,
      timestamp: Date.now(),
    });
  }

  /**
   * Starts sending leader heartbeats.
   */
  private startLeaderHeartbeat(): void {
    this.stopLeaderHeartbeat();
    this.sendLeaderHeartbeat();
    this.leaderHeartbeatTimer = setInterval(() => {
      this.sendLeaderHeartbeat();
    }, 5000); // Send heartbeat every 5 seconds
  }

  /**
   * Stops sending leader heartbeats.
   */
  private stopLeaderHeartbeat(): void {
    if (this.leaderHeartbeatTimer) {
      clearInterval(this.leaderHeartbeatTimer);
      this.leaderHeartbeatTimer = null;
    }
  }

  /**
   * Sends a leader heartbeat message.
   */
  private sendLeaderHeartbeat(): void {
    this.broadcast({
      type: "leader-heartbeat",
      tabId: this.tabId,
      timestamp: Date.now(),
    });
  }

  /**
   * Starts a timeout to detect leader failure.
   */
  private startLeaderTimeout(): void {
    this.cancelLeaderCheck();
    this.leaderCheckTimer = setTimeout(() => {
      // Leader hasn't sent heartbeat, start election
      this.requestLeadership();
    }, 10000); // 10 second timeout
  }

  /**
   * Cancels the leader check timer.
   */
  private cancelLeaderCheck(): void {
    if (this.leaderCheckTimer) {
      clearTimeout(this.leaderCheckTimer);
      this.leaderCheckTimer = null;
    }
  }

  /**
   * Broadcasts an SSE event to other tabs.
   */
  private broadcastEvent(event: ISSEEvent): void {
    if (this.isLeader) {
      this.broadcast({
        type: "sse-event",
        tabId: this.tabId,
        timestamp: Date.now(),
        payload: event,
      });
    }
  }

  /**
   * Sends a message via BroadcastChannel.
   */
  private broadcast(message: IBroadcastMessage): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch {
        // BroadcastChannel may be closed
      }
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Updates the connection status and notifies callback.
   */
  private updateStatus(status: TConnectionStatus): void {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.callbacks.onStatusChange(status);
    }
  }

  /**
   * Clears all timers.
   */
  private clearAllTimers(): void {
    this.stopHeartbeatMonitor();
    this.cancelReconnect();
    this.stopPolling();
    this.stopLeaderHeartbeat();
    this.cancelLeaderCheck();
  }

  /**
   * Generates a unique tab ID.
   */
  private generateTabId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generates a unique event ID.
   */
  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new SSE client instance.
 *
 * @param callbacks - Event callbacks for message handling and status changes
 * @param config - Optional SSE client configuration
 * @returns SSE client instance
 */
export function createSSEClient(
  callbacks: ISSEClientCallbacks,
  config?: Partial<ISSEClientConfig>,
): SSEClient {
  return new SSEClient(callbacks, config);
}
