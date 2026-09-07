import { tagColors } from "../styles/tokens";
import { CircleCheck } from "lucide-react";
type TagProps = {
  children: React.ReactNode;
  variant: "error" | "warning" | "info" | "success" | "neutral";
};

function Tag({ children, variant }: TagProps) {
  return (
    <div
      className={
        tagColors[variant] +
        " " +
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 gap-0.5"
      }
    >
      <CircleCheck size={15} aria-hidden="true" />
      <span className="text-sm whitespace-nowrap">{children}</span>
    </div>
  );
}

export default Tag;
