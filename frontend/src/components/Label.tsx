import { labelStyle } from "../styles/tokens";

type LabelProps = {
  children: React.ReactNode;
  htmlFor: string;
};

function Label({ children, htmlFor }: LabelProps) {
  return (
    <label className={labelStyle} htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export default Label;
