import { useState, useEffect, useMemo } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Input from "../components/Input";
import api from "../api/axios"
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import { Link } from "react-router";

type FriendshipStatus = "none" | "friends" | "request_sent" | "request_received";

type SearchUser = {
	id: number;
	username: string;
	avatarUrl: string | null;
	friendshipStatus: FriendshipStatus;
	friendshipId: number | null;
};

type Friend = {
	id: number;
	username: string;
	avatarUrl: string | null;
};

type IncomingFriendRequest = Friend & {
	requestId: number;
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
	const [friends, setFriends] = useState<Friend[]>([]);
	const [friendsLoading, setFriendsLoading] = useState(true);
	const [friendsError, setFriendsError] = useState("");
	const [incomingRequests, setIncomingRequests] = useState<IncomingFriendRequest[]>([]);
	const [requestsLoading, setRequestsLoading] = useState(true);
	const [requestsError, setRequestsError] = useState("");
	const [users, setUsers] = useState<SearchUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const term = search.trim();
	const sortedUsers = useMemo(
		() => [
			...users.filter((user) => user.friendshipStatus === "request_received"),
			...users.filter((user) => user.friendshipStatus !== "request_received"),
		],
		[users]
	);

	useEffect(() => {
		const controller = new AbortController();
		api.get<Friend[]>("/api/friends", {
			headers: { Authorization: `Bearer ${token ?? ""}` },
			signal: controller.signal,
		})
			.then((response) => {
				setFriends(response.data);
				setFriendsError("");
			})
			.catch(() => {
				if (controller.signal.aborted) return;
				setFriends([]);
				setFriendsError("Could not load friends.");
			})
			.finally(() => {
				if (!controller.signal.aborted) setFriendsLoading(false);
			});

		return () => controller.abort();
	}, [token]);

	useEffect(() => {
		const controller = new AbortController();
		api.get<{ incoming: Array<{ id: number; user: Friend }> }>('/api/friends/requests', {
			headers: { Authorization: `Bearer ${token ?? ""}` },
			signal: controller.signal,
		})
			.then((response) => {
				setIncomingRequests(
					response.data.incoming.map((request) => ({
						id: request.user.id,
						username: request.user.username,
						avatarUrl: request.user.avatarUrl,
						requestId: request.id,
					}))
				);
				setRequestsError("");
			})
			.catch(() => {
				if (controller.signal.aborted) return;
				setIncomingRequests([]);
				setRequestsError("Could not load friend requests.");
			})
			.finally(() => {
				if (!controller.signal.aborted) setRequestsLoading(false);
			});

		return () => controller.abort();
	}, [token]);

	useEffect(() => {
		if (!token || term.length < MIN_SEARCH) {
			return;
		}

		const controller = new AbortController();

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

	if (!user) return null;

	return (
	<div className="p-6">
		<h1 className="text-3xl font-bold text-white mb-6">Contacts</h1>
		<section className="mb-8">
			<h2 className="text-gray-400 text-sm mb-2">Friends</h2>
			<div className="flex flex-col gap-3">
				{friendsLoading && <p className="text-gray-500 text-sm">Loading friends...</p>}
				{friendsError && <p className="text-red-500 text-sm">{friendsError}</p>}
				{!friendsLoading && !friendsError && friends.length === 0 && incomingRequests.length === 0 && (
					<p className="text-gray-500 text-sm">You have no friends yet.</p>
				)}
				{friends.map((friend) => (
					<Card key={friend.id} padding="medium">
						<div className="flex items-center gap-4">
							{friend.avatarUrl ? (
								<img
									src={friend.avatarUrl}
									alt={friend.username}
									className="w-12 h-12 rounded-full object-cover"
								/>
							) : (
								<div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white font-medium">
									{friend.username.charAt(0).toUpperCase()}
								</div>
							)}
							<Link
								to={`/contacts/${friend.id}`}
								className="font-medium text-white hover:text-indigo-300"
							>
								{friend.username}
							</Link>
						</div>
					</Card>
				))}
			</div>

			{requestsLoading && <p className="text-gray-500 text-sm mt-4">Loading friend requests...</p>}
			{requestsError && <p className="text-red-500 text-sm mt-4">{requestsError}</p>}
			{!requestsLoading && !requestsError && incomingRequests.length > 0 && (
				<div className="mt-6">
					<h3 className="text-gray-400 text-sm mb-2">Friend requests</h3>
					<div className="flex flex-col gap-3">
						{incomingRequests.map((request) => (
							<Card key={request.requestId} padding="medium">
								<div className="flex items-center gap-4">
									{request.avatarUrl ? (
										<img
											src={request.avatarUrl}
											alt={request.username}
											className="w-12 h-12 rounded-full object-cover"
										/>
									) : (
										<div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white font-medium">
											{request.username.charAt(0).toUpperCase()}
										</div>
									)}
									<div className="flex-1">
										<p className="font-medium text-white">{request.username}</p>
									</div>
									<div className="flex gap-2">
										<Button
											variant="primary"
											size="small"
											type="button"
											onClick={async () => {
												try {
													await api.post(
														`/api/friends/requests/${request.requestId}/accept`,
														{},
														{ headers: { Authorization: `Bearer ${token ?? ""}` } }
													);
													setFriends((prevFriends) => {
														if (prevFriends.some((friend) => friend.id === request.id)) {
															return prevFriends;
														}
														return [...prevFriends, { id: request.id, username: request.username, avatarUrl: request.avatarUrl }];
													});
													setIncomingRequests((prevRequests) =>
														prevRequests.filter((item) => item.requestId !== request.requestId)
													);
												} catch (err) {
													console.error("Error accepting friend request:", err);
												}
											}}
										>
											Accept
										</Button>
										<Button
											variant="danger"
											size="small"
											type="button"
											onClick={async () => {
												try {
													await api.delete(`/api/friends/requests/${request.requestId}/deny`, {
														headers: { Authorization: `Bearer ${token ?? ""}` },
													});
													setIncomingRequests((prevRequests) =>
														prevRequests.filter((item) => item.requestId !== request.requestId)
													);
												} catch (err) {
													console.error("Error declining friend request:", err);
												}
											}}
										>
											Decline
										</Button>
									</div>
								</div>
							</Card>
						))}
					</div>
				</div>
			)}
		</section>
		<div>
			<Input 
				value={search}
				id="search"
				onChange={(event) => {
					const nextSearch = event.target.value;
					setSearch(nextSearch);
					if (nextSearch.trim().length < MIN_SEARCH) {
						setUsers([]);
						setError("");
						setLoading(false);
					} else {
						setLoading(true);
						setError("");
					}
				}}
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
						{sortedUsers.map((user) => (
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
									{user.friendshipStatus !== "friends" && (
									<Button
										variant="primary"
										size="small"
										type="button"
										disabled={user.friendshipStatus === "request_sent"}
										onClick={async () => {
											try {
												if (user.friendshipStatus === "request_received" && user.friendshipId === null) {
													throw new Error("Incoming friend request is missing its ID.");
												}
												await api.post(
													user.friendshipStatus === "request_received"
														? `/api/friends/requests/${user.friendshipId}/accept`
														: "/api/friends/requests",
													user.friendshipStatus === "request_received" ? {} : { userId: user.id },
													{ headers: { Authorization: `Bearer ${token}` } }
												);
												setUsers((prevUsers) =>
													prevUsers.map((u) =>
														u.id === user.id
															? {
																	...u,
																	friendshipStatus:
																		user.friendshipStatus === "request_received" ? "friends" : "request_sent",
																}
															: u
													)
												);
											} catch (err) {
												console.error("Error handling friend request:", err);
											}
										}}
									>
										{user.friendshipStatus === "request_received" ? "Accept" : "Add Friend"}
									</Button>)}
									{user.friendshipStatus === "request_received" && (
										<Button
											variant="danger"
											size="small"
											type="button"
											icon={false}
											disabled={user.friendshipId === null}
											onClick={async () => {
												if (user.friendshipId === null) return;
												try {
													await api.delete(
														`/api/friends/requests/${user.friendshipId}/deny`,
														{ headers: { Authorization: `Bearer ${token}` } }
													);
													setUsers((prevUsers) =>
														prevUsers.map((u) =>
															u.id === user.id
																? { ...u, friendshipStatus: "none", friendshipId: null }
																: u
														)
													);
												} catch (err) {
													console.error("Error declining friend request:", err);
												}
											}}
										>
											Decline
										</Button>
									)}
									<span className="text-gray-400 text-sm">
										{STATUS_LABEL[user.friendshipStatus as FriendshipStatus]}
									</span>
								</div>
							</Card>
						))}
					</div>
				</>
			)}
		 </div>
		//{ <div className="flex flex-col gap-3">
		//{ {contacts.map((contact) => ( */}
		//	{ <Card key={contact.id} padding="medium">
		//		<div className="flex items-center gap-4">
		//		<img
		//			src={contact.avatar}
		 //			alt={contact.name}
		//			className="w-12 h-12 rounded-full object-cover"
		//		/>
		//		<div className="flex-1">
		//		<p className="text-white font-medium">{contact.name}</p>
		//		</div>
		//		<Badge
		//			variant={contact.online ? "online" : "offline"}
		//			size="medium"
		//		/>
		//		</div>
	    //	</Card>
		//)} }}
	// </div>
	);
}

export default ContactsPage;
