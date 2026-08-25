import { badgeColors, badgeSizes } from "../styles/tokens"

type BadgeProps = {
    variant : "online" | "offline" | "busy" | "invisible"
    size : "small" | "medium" | "large"
    label : string
}

function Badge( {variant, size, label} : BadgeProps) {
    return(
        <div className={badgeColors[variant] + " " + badgeSizes[size]} title={label}></div>
    )
}

export default Badge