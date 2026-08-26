import { tagColors } from "../styles/tokens"

type TagProps = {
    children: React.ReactNode
    variant: "error" | "warning" | "info" | "success" | "neutral"
}

function Tag( {children, variant} : TagProps ){
    return (
    <div
        className={tagColors[variant] + " " + "inline-flex items-center justify-center rounded-full px-2.5 py-0.5"}
        >
        <svg
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="-ms-1 me-1.5 size-4"
        >
            <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
        <p className="text-sm whitespace-nowrap">{children}</p>
    </div>
    )
}

export default Tag