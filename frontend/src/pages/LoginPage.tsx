import {useState} from 'react'
import Input from '../components/Input'
import Button from '../components/Button'
import Card from '../components/Card'
import Label from '../components/Label'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'

function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    console.log(email, password)
  }
  return (
    <div>
      <h1 className="text-4xl font-bold text-blue-500">Connexion</h1>
      <form onSubmit={handleSubmit}>
        <Label htmlFor="email">
          Email :
        </Label>
        <Input 
          value={email}
          id="email" 
          onChange={(event) => setEmail(event.target.value)} 
          type="email" 
          size="medium" 
          placeholder="email"
        />
        <Label htmlFor="password">
          Password :
        </Label>
        <Input 
          value={password}
          id="password" 
          onChange={(event) => setPassword(event.target.value)} 
          type="password" 
          size="medium" 
          placeholder="password"
        />
        <Button 
          variant="secondary" 
          size="medium" 
          type="submit">Log in
        </Button>
      </form>
      <Card
        padding="large">
        <Avatar src="https://i.pravatar.cc/150" alt="Photo de profil" size="large"></Avatar>
        <Badge variant="online" size="large" label="online"></Badge>
      </Card>
    </div>
  )
}

export default LoginPage