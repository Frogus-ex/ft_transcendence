import { Wallet, ListOrdered } from "lucide-react";
import Card from "../components/Card";
import Tooltip from "../components/Tooltip";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";
import { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router";

type OutletContextType = {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
};

const weeklyPnL = [
  { day: "Mon", amount: 120.5 },
  { day: "Tue", amount: -45.2 },
  { day: "Wed", amount: 310.0 },
  { day: "Thu", amount: -80.75 },
  { day: "Fri", amount: 205.3 },
  { day: "Sat", amount: 15.0 },
  { day: "Sun", amount: -20.1 },
];

const positions = [
  { symbol: "BTC", amount: "0.42", value: "$27,300" },
  { symbol: "ETH", amount: "3.1", value: "$8,900" },
  { symbol: "SOL", amount: "50", value: "$4,200" },
];

function ProfilePage() {
  const maxAbs = Math.max(...weeklyPnL.map((d) => Math.abs(d.amount)));
  const maxBarHeight = 128;
  const navigate = useNavigate();
  const { isLoggedIn } = useOutletContext<OutletContextType>();
  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Profile</h1>
      <Card padding="large" className="mb-6">
        <div className="flex items-center gap-4">
          <Avatar
            src="https://i.pravatar.cc/150"
            alt="Profile photo"
            size="large"
          />
          <div>
            <p className="text-white font-semibold text-lg">Tom Lorette</p>
            <Tooltip text="Online">
              <Badge variant="online" size="medium" />
            </Tooltip>
          </div>
        </div>
      </Card>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card padding="medium">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Wallet</span>
            <Wallet size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">$45,231.89</p>
        </Card>
        <Card padding="medium">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Positions</span>
            <ListOrdered size={18} className="text-gray-400" />
          </div>
          <div className="flex flex-col gap-2">
            {positions.map((position) => (
              <div
                key={position.symbol}
                className="flex justify-between text-sm"
              >
                <span className="text-white">{position.symbol}</span>
                <span className="text-gray-400">{position.amount}</span>
                <span className="text-white">{position.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card padding="large">
        <span className="text-gray-400 text-sm mb-4 block">Weekly P&amp;L</span>
        <div className="flex items-end justify-between gap-3 h-40">
          {weeklyPnL.map((data) => {
            const heightPx = (Math.abs(data.amount) / maxAbs) * maxBarHeight;
            const isPositive = data.amount >= 0;
            return (
              <div
                key={data.day}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <Tooltip
                  text={`${isPositive ? "+" : ""}$${data.amount.toFixed(2)}`}
                  className="w-full"
                >
                  <div className="w-full h-32 flex items-end">
                    <div
                      style={{ height: `${heightPx}px` }}
                      className={
                        "w-full rounded-t-md " +
                        (isPositive ? "bg-green-500" : "bg-red-500")
                      }
                    />
                  </div>
                </Tooltip>
                <span className="text-xs text-gray-400">{data.day}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default ProfilePage;
