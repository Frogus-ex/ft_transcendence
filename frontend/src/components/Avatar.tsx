import { imgSizes } from "../styles/tokens"

type AvatarProps = {
    src : string
    alt : string
    size : "small" | "medium" | "large"
}

function Avatar( {src, alt, size} : AvatarProps){
    return (
        <img src={src} alt={alt} className={imgSizes[size]}/>
    )
}

export default Avatar