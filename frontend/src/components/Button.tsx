type ButtonProps = {
    children : React.ReactNode
    variant : "primary" | "secondary"
    size : "small" | "medium" | "large"
    onClick?: () => void 
}

function Button({ children, variant, size, onClick }: ButtonProps) {
    const couleurs = {
        primary: "bg-green-500",
        secondary: "bg-red-500",
    }
    const taille = {
        small: "text-sm px-2 py-1",
        medium: "text-base px-4 py-2",
        large: "text-lg px-6 py-3",
    }
    return (
        <button className={couleurs[variant] + " " + taille[size]} onClick={onClick}>{children}</button>
    )
}

export default Button