import {textSizes} from '../styles/tokens'

type InputProps = {
    value : string
    id : string
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
    type : "text" | "email" | "password"
    placeholder?: string
    size : "small" | "medium" | "large"
}

function Input({value, id, onChange, type, placeholder, size}: InputProps){
    return(
        <input 
            className={textSizes[size]} 
            value={value} 
            id={id}
            onChange={onChange} 
            type={type} 
            placeholder={placeholder} 
        />
    )
}

export default Input