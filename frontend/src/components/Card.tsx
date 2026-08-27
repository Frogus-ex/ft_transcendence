import { textSizes, cardStyle } from "../styles/tokens";

type CardProps = {
  children: React.ReactNode;
  padding: "small" | "medium" | "large";
};

function Card({ children, padding }: CardProps) {
  return <div className={textSizes[padding] + " " + cardStyle}>{children}</div>;
}

export default Card;
