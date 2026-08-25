import {buttonColors, textSizes} from '../styles/tokens'


type ButtonProps = {
    children : React.ReactNode
    variant : "primary" | "secondary"
    size : "small" | "medium" | "large"
    type : "button" | "submit"
    onClick?: () => void 
}

function Button({ children, variant, size, onClick, type }: ButtonProps) {
    return (
        <button 
            className={buttonColors[variant] + " " + textSizes[size]} 
            onClick={onClick}
            type={type}
        >
            {children}
        </button>
    )
}

export default Button