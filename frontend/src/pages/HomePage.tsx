import Button from '../components/Button'
import { useNavigate } from 'react-router'

function HomePage() {
  const navigate = useNavigate()
  return (
    <div>
      <h1 className="text-4xl font-bold text-white">Accueil</h1>
        <p>Bienvenue sur ft_transcendence.</p>
          <Button 
            variant="secondary" 
            size="large" 
            onClick={() => navigate("/login")}
            type="button"
            >
              Login
            </Button>
    </div>
  )
}

export default HomePage