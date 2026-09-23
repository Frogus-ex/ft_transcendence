import { inputStyle, textSizes } from "../styles/tokens";
import { forwardRef } from "react";

type InputProps = {
  value: string;
  id: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type: "text" | "email" | "password";
  placeholder?: string;
  size: "small" | "medium" | "large";
  onFocus?: () => void;
  onBlur?: () => void;
  "aria-invalid"?: boolean | "true" | "false";
};

const Input = forwardRef<HTMLInputElement, InputProps>((
	{ value, id, onChange, type, placeholder, size, onFocus, onBlur, ...rest }, ref) => {
	return (
	<input
		className={textSizes[size] + " " + inputStyle}
		value={value}
		id={id}
		onChange={onChange}
		type={type}
		placeholder={placeholder}
		onFocus={onFocus}
		onBlur={onBlur}
		{...rest}
	/>
	);
})

Input.displayName = "Input";

export default Input;
