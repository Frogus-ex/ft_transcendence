import {textSizes} from '../styles/tokens'

type InputProps = {
    value : string
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
    type : "text" | "email" | "password"
    placeholder?: string
    size : "small" | "medium" | "large"
}

function Input({value, onChange, type, placeholder, size}: InputProps){
    return(
        <input 
            className={textSizes[size]} 
            value={value} 
            onChange={onChange} 
            type={type} 
            placeholder={placeholder} 
        />
    )
}

export default Input