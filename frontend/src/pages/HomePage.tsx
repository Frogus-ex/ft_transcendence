import {
  BadgeDollarSign,
  BarChart3,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import { Link, useNavigate, useOutletContext } from "react-router";

type OutletContextType = {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
};

function HomePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useOutletContext<OutletContextType>();
  return (
    <main className="flex-1 flex flex-col">
      <div className="flex-1">
        <section className="flex items-center justify-between px-12 py-20 gap-12">
          <div className="max-w-xl">
            <h1 className="text-5xl font-bold text-white mb-4">
              <span className="block">Trade in real time,</span>
              <span className="block">risk-free.</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              ft_transcendence is a real-time trading simulator that lets you
              learn the financial markets, track your performance, and connect
              with the community — without ever risking real money.
            </p>
            {isLoggedIn ? (
              <Button
                variant="primary"
                size="large"
                type="button"
                onClick={() => navigate("/profile")}
              >
                Get Started
              </Button>
            ) : (
              <Button
                variant="primary"
                size="large"
                type="button"
                onClick={() => navigate("/login")}
              >
                Get Started
              </Button>
            )}
          </div>
          <div className="flex-shrink-0">
            <TrendingUp size={220} className="text-green-500 opacity-80" />
          </div>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 px-12 py-16">
          <Card padding="large">
            <Zap size={32} className="text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Real-Time Trading
            </h3>
            <p className="text-gray-400">
              Trade with live market data and see your positions update
              instantly.
            </p>
          </Card>
          <Card padding="large">
            <ShieldCheck size={32} className="text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Secure by Design
            </h3>
            <p className="text-gray-400">
              Two-factor authentication and encrypted sessions keep your account
              and your funds safe.{" "}
            </p>
          </Card>
          <Card padding="large">
            <Users size={32} className="text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Social Trading
            </h3>
            <p className="text-gray-400">
              Add friends, chat in real time, and compare your performance on
              the leaderboard.
            </p>
          </Card>
          <Card padding="large">
            <BarChart3 size={32} className="text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Advanced Analytics
            </h3>
            <p className="text-gray-400">
              Track your portfolio, review your trade history, and visualize
              your progress over time.
            </p>
          </Card>
        </section>
      </div>
      <footer className="border-t border-gray-800 px-12 py-8 text-gray-400">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BadgeDollarSign size={20} className="text-yellow-400" />
              <span className="font-semibold text-white">ft_transcendence</span>
            </div>
            <p className="text-sm">Trade smarter, together.</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-white font-medium mb-1">Navigation</span>
            <Link to="/profile" className="text-sm hover:text-white">
              Profile
            </Link>
            <Link to="/markets" className="text-sm hover:text-white">
              Markets
            </Link>
            <Link to="/contacts" className="text-sm hover:text-white">
              Contacts
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-white font-medium mb-1">Legal</span>
            <span className="text-sm">Terms of Service</span>
            <span className="text-sm">Privacy Policy</span>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-4 text-sm text-center">
          © 2026 ft_transcendence — Made at 42 Paris
        </div>
      </footer>
    </main>
  );
}

export default HomePage;