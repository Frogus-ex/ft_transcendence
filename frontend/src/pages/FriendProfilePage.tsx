import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import api from "../api/axios";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { PortfolioProvider, usePortfolio, type Order } from "../context/PortfolioContext";
import { Wallet, ListOrdered } from "lucide-react";
import { MarketProvider } from "../context/MarketContext";

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

type FriendProfile = {
	id: number;
	username: string;
	avatarUrl: string | null;
};

function FriendProfilePageContent() {
	const { friendId } = useParams();
	const { token } = useAuth();
	const [profile, setProfile] = useState<FriendProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const invalidProfileId = !token || !friendId || !/^\d+$/.test(friendId);

	const { balance, positions, orders } = usePortfolio();
	
	  if (!token) return null;
	
	  const weeklyPnL = computeWeeklyPnL(orders);
	  const maxAbs = Math.max(1, ...weeklyPnL.map((d) => Math.abs(d.amount)));
	  const maxBarHeight = 128;

	useEffect(() => {
		if (invalidProfileId) return;

		const controller = new AbortController();
		api.get<FriendProfile>(`/api/friends/${friendId}/profile`, {
			headers: { Authorization: `Bearer ${token}` },
			signal: controller.signal,
		})
			.then((response) => setProfile(response.data))
			.catch(() => {
				if (!controller.signal.aborted) setError("Could not load this profile.");
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});

		return () => controller.abort();
	}, [friendId, invalidProfileId, token]);

	return (
		<div className="p-6">
			<Link to="/contacts" className="text-indigo-400 hover:text-indigo-300">
				&larr; Back to contacts
			</Link>
			<h1 className="mt-6 mb-6 text-3xl font-bold text-white">Profile</h1>
			{loading && !invalidProfileId && <p className="text-gray-400">Loading profile...</p>}
			{(invalidProfileId || error) && <p className="text-red-500">{error || "Could not load this profile."}</p>}
			{profile && (
				<Card padding="large">
					<div className="flex items-center gap-4">
						{profile.avatarUrl ? (
							<img
								src={profile.avatarUrl}
								alt={profile.username}
								className="h-16 w-16 rounded-full object-cover"
							/>
						) : (
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700 font-medium text-white">
								{profile.username.charAt(0).toUpperCase()}
							</div>
						)}
						<p className="text-lg font-semibold text-white">{profile.username}</p>
					</div>
				</Card>
			)}
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
		</div>
		
	);
}

function FriendProfilePage() {
	const { user, isLoading } = useAuth();
	const { friendId } = useParams();
	const friendUserId = friendId && /^\d+$/.test(friendId) ? Number(friendId) : undefined;

  if (isLoading) return <p className="p-6 text-gray-400">Loading...</p>;
  if (!user) return null;

  return (
    <MarketProvider>
      <PortfolioProvider userId={friendUserId}>
        <FriendProfilePageContent />
      </PortfolioProvider>
    </MarketProvider>
  );
}

export default FriendProfilePage;
