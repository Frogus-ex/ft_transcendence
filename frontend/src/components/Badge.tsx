import { badgeColors, badgeSizes } from "../styles/tokens"

type BadgeProps = {
  variant: "online" | "offline" | "busy" | "invisible"
  size: "small" | "medium" | "large"
}

function Badge({ variant, size }: BadgeProps) {
  return (
    <div
      className={badgeColors[variant] + " " + badgeSizes[size]}
    ></div>
  )
}

export default Badge