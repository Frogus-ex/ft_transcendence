import { useState } from "react";
import Modal from "../components/Modal";
import Button from "../components/Button";
import { Outlet, Link } from "react-router";
import {
  BadgeDollarSign,
  Menu,
  MessageSquare,
  CircleUser,
  Home,
  LogIn,
  ChartNoAxesCombined,
  BriefcaseBusiness,
} from "lucide-react";
import {
  pageBackground,
  textPrimary,
  surfaceBackground,
  borderColor,
} from "../styles/tokens";

function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  return (
    <div className={pageBackground + " " + textPrimary + " min-h-screen flex"}>
      <aside
        className={
          surfaceBackground +
          " " +
          borderColor +
          " border-r flex flex-col transition-all duration-200 " +
          (isSidebarOpen ? "w-64" : "w-16")
        }
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={24} className="text-yellow-400" />
          </button>
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <BadgeDollarSign size={24} className="text-yellow-400" />
                <span className="font-semibold text-lg text-yellow-400">
                  ft_transcendence
                </span>
              </Link>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1 px-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-800"
          >
            <Home size={20} />
            {isSidebarOpen && <span>Accueil</span>}
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-800"
          >
            <BriefcaseBusiness size={20} />
            {isSidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            to="/markets"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-800"
          >
            <ChartNoAxesCombined size={20} />
            {isSidebarOpen && <span>Markets</span>}
          </Link>
          <Link
            to="/friends"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-800"
          >
            <MessageSquare size={20} />
            {isSidebarOpen && <span>Friends</span>}
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-800"
          >
            <CircleUser size={20} />
            {isSidebarOpen && <span>Profile</span>}
          </Link>
          {isLoggedIn && (
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-800 w-full text-left"
            >
              <LogIn size={20} />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          )}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen">
        <Outlet context={{ isLoggedIn, setIsLoggedIn }} />
      </div>
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      >
        <p className="mb-4">Voulez-vous vous déconnecter ?</p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="primary"
            size="medium"
            type="button"
            onClick={() => {
              setIsLoggedIn(false);
              setIsLogoutModalOpen(false);
            }}
          >
            Oui
          </Button>
          <Button
            variant="secondary"
            size="medium"
            type="button"
            onClick={() => setIsLogoutModalOpen(false)}
          >
            Non
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default MainLayout;
