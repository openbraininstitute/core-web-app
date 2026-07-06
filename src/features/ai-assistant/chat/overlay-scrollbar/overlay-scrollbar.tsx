'use client';

import React from 'react';

import styles from './overlay-scrollbar.module.css';

/**
 * OverlayScrollbar renders a custom floating scrollbar thumb that overlays
 * content without taking any layout space. This eliminates the cross-browser
 * inconsistency where `scrollbar-gutter: stable` is ignored when the OS uses
 * overlay scrollbars (macOS trackpad mode), causing random padding changes.
 *
 * The native scrollbar must be hidden on the target container via:
 *   scrollbar-width: none;           (Firefox)
 *   ::-webkit-scrollbar { display: none; }  (Chrome/Safari/Edge)
 *
 * The thumb appears on scroll and fades out after a short idle period,
 * matching the macOS / ChatGPT overlay scrollbar UX.
 *
 * Performance: MutationObserver uses childList-only (no subtree) to avoid
 * thrashing during heavy DOM updates (e.g. plot rendering). A debounced
 * ResizeObserver on the container catches size changes from deep subtree
 * mutations without per-mutation overhead.
 */
export default function OverlayScrollbar({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const thumbRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const fadeTimerRef = React.useRef<ReturnType<typeof setTimeout>>();
  const isDraggingRef = React.useRef(false);
  const dragStartYRef = React.useRef(0);
  const dragStartScrollTopRef = React.useRef(0);

  // Cache last-known scrollHeight to skip redundant paints
  const lastScrollHeightRef = React.useRef(0);
  const lastScrollTopRef = React.useRef(0);
  const lastClientHeightRef = React.useRef(0);

  const updateThumb = React.useCallback(() => {
    const container = containerRef.current;
    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!container || !thumb || !track) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // Don't show if content doesn't overflow
    if (scrollHeight <= clientHeight) {
      track.classList.remove(styles.visible);
      lastScrollHeightRef.current = scrollHeight;
      lastScrollTopRef.current = scrollTop;
      lastClientHeightRef.current = clientHeight;
      return;
    }

    // Skip DOM writes if nothing actually changed
    if (
      scrollHeight === lastScrollHeightRef.current &&
      scrollTop === lastScrollTopRef.current &&
      clientHeight === lastClientHeightRef.current
    ) {
      return;
    }

    lastScrollHeightRef.current = scrollHeight;
    lastScrollTopRef.current = scrollTop;
    lastClientHeightRef.current = clientHeight;

    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 24);
    const maxThumbTop = trackHeight - thumbHeight;
    const scrollFraction = scrollTop / (scrollHeight - clientHeight);
    const thumbTop = scrollFraction * maxThumbTop;

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;

    // Show
    track.classList.add(styles.visible);

    // Reset fade timer
    clearTimeout(fadeTimerRef.current);
    if (!isDraggingRef.current) {
      fadeTimerRef.current = setTimeout(() => {
        track?.classList.remove(styles.visible);
      }, 2500);
    }
  }, [containerRef]);

  // Scroll listener — one rAF per frame max
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const scheduleUpdate = () => {
      if (rafId !== null) return; // already scheduled
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateThumb();
      });
    };

    container.addEventListener('scroll', scheduleUpdate, { passive: true });

    // ResizeObserver catches container size changes (including those caused
    // by deep subtree mutations like plot rendering). This replaces the
    // expensive subtree MutationObserver.
    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(container);

    // Shallow MutationObserver — only direct children (messages added/removed).
    // Deep subtree changes (plot SVG internals) are caught by ResizeObserver
    // when they affect the container's scrollHeight.
    const mo = new MutationObserver(scheduleUpdate);
    mo.observe(container, { childList: true });

    // Initial update
    updateThumb();

    return () => {
      container.removeEventListener('scroll', scheduleUpdate);
      ro.disconnect();
      mo.disconnect();
      clearTimeout(fadeTimerRef.current);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [containerRef, updateThumb]);

  // Drag handling — let user drag the thumb to scroll
  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      dragStartYRef.current = e.clientY;
      dragStartScrollTopRef.current = containerRef.current?.scrollTop ?? 0;
      clearTimeout(fadeTimerRef.current);

      const thumb = thumbRef.current;
      thumb?.setPointerCapture(e.pointerId);

      const onPointerMove = (ev: PointerEvent) => {
        const container = containerRef.current;
        const track = trackRef.current;
        if (!container || !track || !thumb) return;

        const deltaY = ev.clientY - dragStartYRef.current;
        const trackHeight = track.clientHeight;
        const thumbHeight = thumb.clientHeight;
        const maxThumbTop = trackHeight - thumbHeight;
        const scrollRange = container.scrollHeight - container.clientHeight;
        const scrollDelta = (deltaY / maxThumbTop) * scrollRange;

        container.scrollTop = dragStartScrollTopRef.current + scrollDelta;
      };

      const onPointerUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);

        // Start fade timer after drag ends
        fadeTimerRef.current = setTimeout(() => {
          trackRef.current?.classList.remove(styles.visible);
        }, 2500);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    },
    [containerRef]
  );

  // Click on track to jump to position
  const handleTrackClick = React.useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      const track = trackRef.current;
      const thumb = thumbRef.current;
      if (!container || !track || !thumb) return;

      // Ignore if the click was on the thumb itself
      if (e.target === thumb) return;

      const trackRect = track.getBoundingClientRect();
      const clickY = e.clientY - trackRect.top;
      const trackHeight = track.clientHeight;
      const scrollFraction = clickY / trackHeight;
      const scrollRange = container.scrollHeight - container.clientHeight;

      container.scrollTop = scrollFraction * scrollRange;
    },
    [containerRef]
  );

  return (
    <div ref={trackRef} className={styles.track} onClick={handleTrackClick}>
      <div ref={thumbRef} className={styles.thumb} onPointerDown={handlePointerDown} />
    </div>
  );
}
