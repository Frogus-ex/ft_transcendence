import { Wallet, ListOrdered } from "lucide-react";
import Card from "../components/Card";
import Tooltip from "../components/Tooltip";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";
import ProfileEditForm from "../components/ProfileEditForm";
import ApiKeyPanel from "../components/ApiKeyPanel";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { MarketProvider } from "../context/MarketContext";
import { PortfolioProvider, usePortfolio, type Order } from "../context/PortfolioContext";

const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function computeWeeklyPnL(orders: Order[]) {
  const days: { day: string; amount: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    const amount = orders
      .filter((o) => o.realized_pnl !== null)
      .filter((o) => {
        const created = new Date(o.created_at);
        return (
          created.getFullYear() === d.getFullYear() &&
          created.getMonth() === d.getMonth() &&
          created.getDate() === d.getDate()
        );
      })
      .reduce((sum, o) => sum + (o.realized_pnl ?? 0), 0);

    days.push({ day: dayLabels[d.getDay()], amount });
  }

  return days;
}

function ProfilePageContent() {
  const { user } = useAuth();
  const { balance, positions, orders } = usePortfolio();

  if (!user) return null;

  const weeklyPnL = computeWeeklyPnL(orders);
  const maxAbs = Math.max(1, ...weeklyPnL.map((d) => Math.abs(d.amount)));
  const maxBarHeight = 128;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Profile</h1>
      <Card padding="large" className="mb-6">
        <div className="flex items-center gap-4">
          <Avatar
            src={user.avatarUrl ?? "https://i.pravatar.cc/150"}
            alt="Profile photo"
            size="large"
          />
          <div>
            <p className="text-white font-semibold text-lg">{user.username}</p>
            <Tooltip text="Online">
              <Badge variant="online" size="medium" />{user.username}
            </Tooltip>
          </div>
        </div>
      </Card>
	  <ProfileEditForm />
	  <ApiKeyPanel />
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card padding="medium">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Wallet</span>
            <Wallet size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${balance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>
        <Card padding="medium">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Positions</span>
            <ListOrdered size={18} className="text-gray-400" />
          </div>
          <div className="flex flex-col gap-2">
            {positions.length === 0 && (
              <span className="text-gray-500 text-sm">Aucune position ouverte.</span>
            )}
            {positions.map((position) => (
              <div key={position.symbol} className="flex justify-between text-sm">
                <span className="text-white">{position.symbol}</span>
                <span className="text-gray-400">{position.quantity}</span>
                <span className="text-white">
                  ${position.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card padding="large">
        <span className="text-gray-400 text-sm mb-4 block">Weekly P&amp;L</span>
        <div className="flex items-end justify-between gap-3 h-40">
          {weeklyPnL.map((data, i) => {
            const heightPx = (Math.abs(data.amount) / maxAbs) * maxBarHeight;
            const isPositive = data.amount >= 0;
            return (
              <div key={`${data.day}-${i}`} className="flex-1 flex flex-col items-center gap-2">
                <Tooltip text={`${isPositive ? "+" : ""}$${data.amount.toFixed(2)}`} className="w-full">
                  <div className="w-full h-32 flex items-end">
                    <div
                      style={{ height: `${heightPx}px` }}
                      className={"w-full rounded-t-md " + (isPositive ? "bg-green-500" : "bg-red-500")}
                    />
                  </div>
                </Tooltip>
                <span className="text-xs text-gray-400">{data.day}</span>
              </div>
            );
          })}
        </div>
      </Card>
	  <div className="mt-6">
        <Link to="/gdpr" className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
          Gérer mes données (RGPD)
        </Link>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) return <p className="p-6 text-gray-400">Loading...</p>;
  if (!user) return null;

  return (
    <MarketProvider>
      <PortfolioProvider>
        <ProfilePageContent />
      </PortfolioProvider>
    </MarketProvider>
  );
}

export default ProfilePage;