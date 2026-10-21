import { useState, useEffect, useMemo } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Input from "../components/Input";
import api from "../api/axios"
import { useAuth } from "../context/AuthContext";

type FriendshipStatus = "none" | "friends" | "request_sent" | "request_received";

type SearchUser = {
	id: number;
	username: string;
	avatarUrl: string | null;
	friendshipStatus: FriendshipStatus;
};

const MIN_SEARCH = 2;
const DEBOUNCE_MS = 300;

const STATUS_LABEL: Record<FriendshipStatus, string> = {
	none: "",
	friends: "Friend",
	request_sent: "Request sent",
	request_received: "Wants to be your friend",
};


function ContactsPage() {
	const { user, token } = useAuth();

	const [search, setSearch] = useState("");
	const [friends, setFriends] = useState<SearchUser[]>([]);
	const [users, setUsers] = useState<SearchUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const term = search.trim();

	if (!user) return null;

	// const matchingFriends = useMemo(() => {
	// 	const query = term.toLowerCase();
	// 	const contacts = await api.get<{ users: SearchUser[] }>("/api/friends", {
	// 		headers: { Authorization: `Bearer ${auth?.accessToken}` },
	// 	});
	// 	setFriends(contacts.data.users);
	// 	return friends.filter((friend) => friend.username.toLowerCase().includes(query));
	// }, [term]);

	useEffect(() => {
		if (!token || term.length < MIN_SEARCH) {
			setUsers([]);
			setError("");
			return;
		}

		const controller = new AbortController();
		setLoading(true);

		const timer = setTimeout(async () => {
			try {
				const res = await api.get<{ users: SearchUser[] }>("/api/users", {
					params: { search: term, limit: 10 },
					headers: { Authorization: `Bearer ${token}` },
					signal: controller.signal,
				});
				setUsers(res.data.users);
				setError("");
			} catch {
				if (controller.signal.aborted) return;
				setUsers([]);
				setError("Could not search users.");
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		}, DEBOUNCE_MS);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [term, token]);

	return (
	<div className="p-6">
		<h1 className="text-3xl font-bold text-white mb-6">Contacts</h1>
		<div>
			<Input 
				value={search}
				id="search"
				onChange={(event) => setSearch(event.target.value)}
				type="text"
				size="medium"
				placeholder="Search for user" 
			/>
		</div>
		{term.length > 0 && (
				<>
					<h2 className="text-gray-400 text-sm mb-2">Users</h2>
					<div className="flex flex-col gap-3">
						{term.length < MIN_SEARCH && (
							<p className="text-gray-500 text-sm">
								Type at least {MIN_SEARCH} characters to search other users.
							</p>
						)}
						{term.length >= MIN_SEARCH && loading && (
							<p className="text-gray-500 text-sm">Searching...</p>
						)}
						{error && <p className="text-red-500 text-sm">{error}</p>}
						{term.length >= MIN_SEARCH && !loading && !error && users.length === 0 && (
							<p className="text-gray-500 text-sm">No other users found.</p>
						)}
						{users.map((user) => (
							<Card key={user.id} padding="medium">
								<div className="flex items-center gap-4">
									{user.avatarUrl ? (
										<img
											src={user.avatarUrl}
											alt={user.username}
											className="w-12 h-12 rounded-full object-cover"
										/>
									) : (
										<div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white font-medium">
											{user.username.charAt(0).toUpperCase()}
										</div>
									)}
									<div className="flex-1">
										<p className="text-white font-medium">{user.username}</p>
									</div>
									<span className="text-gray-400 text-sm">
										{STATUS_LABEL[user.friendshipStatus as FriendshipStatus]}
									</span>
								</div>
							</Card>
						))}
					</div>
				</>
			)}
		{/* <div className="flex flex-col gap-3">
		{contacts.map((contact) => (
			<Card key={contact.id} padding="medium">
				<div className="flex items-center gap-4">
				<img
					src={contact.avatar}
		 			alt={contact.name}
					className="w-12 h-12 rounded-full object-cover"
				/>
				<div className="flex-1">
				<p className="text-white font-medium">{contact.name}</p>
				</div>
				<Badge
					variant={contact.online ? "online" : "offline"}
					size="medium"
				/>
				</div>
	    	</Card> */}
	</div>
	);
}

export default ContactsPage;
