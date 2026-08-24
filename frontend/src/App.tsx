import { Outlet, Link } from 'react-router'

function App() {
  return (
    <div>
      <nav>
        <Link to="/">Accueil</Link>
        {' | '}
        <Link to="/login">Connexion</Link>
      </nav>
      <Outlet />
    </div>
  )
}

export default App