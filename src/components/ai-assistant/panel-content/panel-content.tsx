import { Spinner } from "../spinner";
import Chat from "./chat";
import History from "./history";

interface PanelContentProps {
	className?: string;
	threadId: string | undefined;
	onClearChat(): void;
	tab: "chat" | "history";
}

export default function PanelContent({
	className,
	threadId,
	onClearChat,
	tab,
}: PanelContentProps) {
	return (
		<>
			{threadId ? (
				<>
					{tab === "chat" && (
						<Chat
							className={className}
							threadId={threadId}
							onClearChat={onClearChat}
						/>
					)}
					{tab === "history" && <History className={className} />}
				</>
			) : (
				<Spinner />
			)}
		</>
	);
}
