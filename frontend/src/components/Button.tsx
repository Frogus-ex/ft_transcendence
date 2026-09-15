import { buttonColors, textSizes, textColors } from "../styles/tokens";
import { CircleArrowRight } from "lucide-react";

type ButtonProps = {
  children: React.ReactNode;
  variant: "primary" | "secondary" | "danger";
  size: "small" | "medium" | "large";
  type: "button" | "submit";
  onClick?: () => void;
  icon?: boolean; // nouvelle prop optionnelle
  shape?: "pill" | "square"; // nouvelle prop optionnelle
};

function Button({
  children,
  variant,
  size,
  onClick,
  type,
  icon = true,
  shape = "pill",
}: ButtonProps) {
  return (
    <button
      className={
        buttonColors[variant] +
        " " +
        textSizes[size] +
        " " +
        textColors.default +
        " " +
        "group inline-flex items-center gap-1.5 " +
        (shape === "pill" ? "rounded-full" : "rounded-md")
      }
      onClick={onClick}
      type={type}
    >
      {children}
      {icon && (
        <CircleArrowRight
          size={20}
          className="transition-transform group-hover:translate-x-1"
        />
      )}
    </button>
  );
}

export default Button;