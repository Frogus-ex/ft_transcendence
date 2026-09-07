import { textSizes, cardStyle } from "../styles/tokens";

type CardProps = {
  children: React.ReactNode;
  padding: "small" | "medium" | "large";
  className?: string;
};

function Card({ children, padding, className = "" }: CardProps) {
  return (
    <div className={textSizes[padding] + " " + cardStyle + " " + className}>
      {children}
    </div>
  );
}

export default Card;
