import {
  BarChart3,
  KeyRound,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import { useNavigate, useOutletContext } from "react-router";

type OutletContextType = {
  isLoggedIn: boolean;
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
              learn the financial markets and track your performance, without
              ever risking real money.
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
              Hashed passwords, HTTPS and rate-limited endpoints keep your
              account safe, and you can export or delete your data at any time.
            </p>
          </Card>
          <Card padding="large">
            <KeyRound size={32} className="text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Open API
            </h3>
            <p className="text-gray-400">
              Generate an API key to read your portfolio and place orders from
              your own scripts, with documented endpoints.
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
    </main>
  );
}

export default HomePage;