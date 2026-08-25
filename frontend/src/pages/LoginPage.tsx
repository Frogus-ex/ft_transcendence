import {useState} from 'react'
import Input from '../components/Input'
import Button from '../components/Button'
import Card from '../components/Card'

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
        <Input 
          value={email} 
          onChange={(event) => setEmail(event.target.value)} 
          type="email" 
          size="medium" 
          placeholder="email"
        />
        <Input 
          value={password} 
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
        padding="large">profile card
      </Card>
    </div>
  )
}

export default LoginPage