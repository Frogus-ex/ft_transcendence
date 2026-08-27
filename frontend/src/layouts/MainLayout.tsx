import { Outlet, Link } from 'react-router'
import { BadgeDollarSign } from 'lucide-react'
import { borderColor, pageBackground, surfaceBackground, textColors, textPrimary } from '../styles/tokens'

function MainLayout() {
  return (
    <div className={pageBackground + " " + textPrimary + " min-h-screen "}>
      <nav className={"flex items-center justify-between px-6 py-4 border-b" + " " + surfaceBackground + " " + borderColor}>
        <div className="flex items-center gap-2">
        <BadgeDollarSign size={50} className="text-yellow-400" />
          <span className="font-semibold text-lg text-yellow-400 ">ft_transcendence</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/">Accueil</Link>
            {' | '}
          <Link to="/login">Connexion</Link>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}

export default MainLayout