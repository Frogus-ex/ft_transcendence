import { buttonColors, textSizes, textColors } from "../styles/tokens";
import { CircleArrowRight } from "lucide-react";

type ButtonProps = {
  children: React.ReactNode;
  variant: "primary" | "secondary";
  size: "small" | "medium" | "large";
  type: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

function Button({ children, variant, size, onClick, type, disabled }: ButtonProps) {
  return (
    <button
      className={
        buttonColors[variant] +
        " " +
        textSizes[size] +
        " " +
        textColors.default +
        " " +
        "group rounded-full inline-flex items-center gap-1.5"
      }
      onClick={onClick}
      type={type}
	  disabled={disabled}
    >
      {children}
      <CircleArrowRight
        size={20}
        className="transition-transform group-hover:translate-x-1"
      />
    </button>
  );
}

export default Button;
