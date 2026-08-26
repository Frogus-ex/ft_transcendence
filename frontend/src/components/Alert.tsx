import { alertColors, alertLabels } from "../styles/tokens"

type AlertProps = {
    variant: "error" | "success" | "warning" | "info"
    children: React.ReactNode
}

function Alert( {variant, children } : AlertProps ) {
return (
    <div
    role="alert"
    className={alertColors[variant] + " border-2 p-4 shadow-[4px_4px_0_0] shadow-black"}
    >
    <div className="flex items-start gap-3">
        <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="mt-0.5 size-4"
        >
        <path
            fillRule="evenodd"
            d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
        />
        </svg>

        <strong className="block flex-1 leading-tight font-semibold">
        <span className="sr-only">{alertLabels[variant]}</span>
            {children}
        </strong>
    </div>
    </div>
    )
}

export default Alert