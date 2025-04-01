import Link from "next/link";

export default function ActionButton({
    type,
    label,
    action,
    link,
    disabled,
    children,
}:{
    type: "button" | "link";
    label: string;
    action?: () => void;
    link?: string;
    disabled?: boolean;
    children: React.ReactNode;
}) {

    return type === "link" ? (
        <button
            type="button"
            className="relative flex flex-row gap-x-2 items-center"
            style={{
                color: disabled ? "#A0AEC0" : "#002766",
                opacity: disabled ? 0.8 : 1,
                pointerEvents: disabled ? "none" : "auto",
                cursor: disabled ? "not-allowed" : "pointer",
            }}
            onClick={action}
            disabled={disabled}
            aria-label={label}
            >
            <span className="block text-sm font-normal mr-2">
                {
                    label
                }
            </span>
            <div className="w-12 h-12 border border-solid border-gray-300 flex items-center justify-center">
                {
                    children
                }
            </div>
        </button>
    ) : (
        <Link
            href={link || "#"}
            className="relative flex flex-row gap-x-2 items-center text-primary-9 disabled:text-gray-500 disabled:opacity-50"
            style={{
                color: disabled ? "#A0AEC0" : "#002766",
                opacity: disabled ? 0.8 : 1,
                pointerEvents: disabled ? "none" : "auto",
                cursor: disabled ? "not-allowed" : "pointer",
            }}
            aria-label={label}
            aria-disabled={disabled ? "true" : "false"}
            target="_blank"
            >
            <span className="block text-sm font-normal mr-1">
                {
                    label
                }
            </span>
            <div className="w-12 h-12 border border-solid border-gray-300 flex items-center justify-center">
                {
                    children
                }
            </div>
        </Link>
    )
}