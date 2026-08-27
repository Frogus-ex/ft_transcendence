import { alertColors, alertLabels } from "../styles/tokens";
import { AlertTriangle } from "lucide-react";

type AlertProps = {
  variant: "error" | "success" | "warning" | "info";
  children: React.ReactNode;
};

function Alert({ variant, children }: AlertProps) {
  return (
    <div
      role="alert"
      className={
        alertColors[variant] + " border-2 p-4 shadow-[4px_4px_0_0] shadow-black"
      }
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5" aria-hidden="true" />
        <strong className="block flex-1 leading-tight font-semibold">
          <span className="sr-only">{alertLabels[variant]}</span>
          {children}
        </strong>
      </div>
    </div>
  );
}

export default Alert;
