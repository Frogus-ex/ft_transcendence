import { useState } from "react";

type TooltipProps = {
  children: React.ReactNode;
  text: string;
  className?: string;
};

function Tooltip({ children, text, className = "" }: TooltipProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={"relative inline-block " + className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {text}
        </div>
      )}
    </div>
  );
}

export default Tooltip;
