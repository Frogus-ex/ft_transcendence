import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import api from "../api/axios";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useAuth } from "../context/AuthContext";

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

function buildAuthHeaders(token: string | null) {
  return { Authorization: token ? `Bearer ${token}` : "" };
}

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
      ...users.filter((entry) => entry.friendshipStatus === "request_received"),
      ...users.filter((entry) => entry.friendshipStatus !== "request_received"),
    ],
    [users]
  );

  useEffect(() => {
    if (!token) {
      setFriends([]);
      setFriendsLoading(false);
      return;
    }

    const controller = new AbortController();
    api
      .get<Friend[]>("/api/friends", {
        headers: buildAuthHeaders(token),
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
    if (!token) {
      setIncomingRequests([]);
      setRequestsLoading(false);
      return;
    }

    const controller = new AbortController();
    api
      .get<{ incoming: Array<{ id: number; user: Friend }> }>("/api/friends/requests", {
        headers: buildAuthHeaders(token),
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
      setUsers([]);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    const timer = window.setTimeout(async () => {
      try {
        const res = await api.get<{ users: SearchUser[] }>("/api/users", {
          params: { search: term, limit: 10 },
          headers: buildAuthHeaders(token),
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
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, token]);

  if (!user) return null;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold text-white">Contacts</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-sm text-gray-400">Friends</h2>
        <div className="flex flex-col gap-3">
          {friendsLoading && <p className="text-sm text-gray-500">Loading friends...</p>}
          {friendsError && <p className="text-sm text-red-500">{friendsError}</p>}
          {!friendsLoading && !friendsError && friends.length === 0 && incomingRequests.length === 0 && (
            <p className="text-sm text-gray-500">You have no friends yet.</p>
          )}

          {friends.map((friend) => (
            <Card key={friend.id} padding="medium">
              <div className="flex items-center gap-4">
                {friend.avatarUrl ? (
                  <img src={friend.avatarUrl} alt={friend.username} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 font-medium text-white">
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                )}

                <Link to={`/contacts/${friend.id}`} className="font-medium text-white hover:text-indigo-300">
                  {friend.username}
                </Link>
				<div className="flex gap-2">
	                <Button
	                  variant="danger"
	                  size="small"
	                  type="button"
	                  onClick={async () => {
	                    if (!token) return;

	                    try {
	                      await api.delete(`/api/friends/${friend.id}`, {
	                        headers: buildAuthHeaders(token),
	                      });

	                      setFriends((prevFriends) => prevFriends.filter((currentFriend) => currentFriend.id !== friend.id));
	                      setUsers((prevUsers) =>
	                        prevUsers.map((entry) =>
	                          entry.id === friend.id ? { ...entry, friendshipStatus: "none", friendshipId: null } : entry
	                        )
	                      );
	                    } catch (err) {
	                      //console.error("Error removing friend:", err);
	                    }
	                  }}
	                >
	                  Remove Friend
	                </Button>
				</div>
              </div>
            </Card>
          ))}
        </div>

        {requestsLoading && <p className="mt-4 text-sm text-gray-500">Loading friend requests...</p>}
        {requestsError && <p className="mt-4 text-sm text-red-500">{requestsError}</p>}

        {!requestsLoading && !requestsError && incomingRequests.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm text-gray-400">Friend requests</h3>
            <div className="flex flex-col gap-3">
              {incomingRequests.map((request) => (
                <Card key={request.requestId} padding="medium">
                  <div className="flex items-center gap-4">
                    {request.avatarUrl ? (
                      <img src={request.avatarUrl} alt={request.username} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 font-medium text-white">
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
                          if (!token) return;

                          try {
                            await api.post(
                              `/api/friends/requests/${request.requestId}/accept`,
                              {},
                              { headers: buildAuthHeaders(token) }
                            );

                            setFriends((prevFriends) => {
                              if (prevFriends.some((friendItem) => friendItem.id === request.id)) {
                                return prevFriends;
                              }

                              return [...prevFriends, { id: request.id, username: request.username, avatarUrl: request.avatarUrl }];
                            });

                            setIncomingRequests((prevRequests) =>
                              prevRequests.filter((item) => item.requestId !== request.requestId)
                            );
                          } catch (err) {
                            //console.error("Error accepting friend request:", err);
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
                          if (!token) return;

                          try {
                            await api.delete(`/api/friends/requests/${request.requestId}/deny`, {
                              headers: buildAuthHeaders(token),
                            });
                            setIncomingRequests((prevRequests) =>
                              prevRequests.filter((item) => item.requestId !== request.requestId)
                            );
                          } catch (err) {
                            //console.error("Error declining friend request:", err);
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
            }
          }}
          type="text"
          size="medium"
          placeholder="Search for user"
        />
      </div>

      {term.length > 0 && (
        <>
          <h2 className="mb-2 mt-4 text-sm text-gray-400">Users</h2>
          <div className="flex flex-col gap-3">
            {term.length < MIN_SEARCH && (
              <p className="text-sm text-gray-500">Type at least {MIN_SEARCH} characters to search other users.</p>
            )}
            {term.length >= MIN_SEARCH && loading && <p className="text-sm text-gray-500">Searching...</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {term.length >= MIN_SEARCH && !loading && !error && users.length === 0 && (
              <p className="text-sm text-gray-500">No other users found.</p>
            )}

            {sortedUsers.map((entry) => (
              <Card key={entry.id} padding="medium">
                <div className="flex items-center gap-4">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt={entry.username} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 font-medium text-white">
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="font-medium text-white">{entry.username}</p>
                  </div>

                  {entry.friendshipStatus !== "friends" && (
                    <Button
                      variant="primary"
                      size="small"
                      type="button"
                      disabled={entry.friendshipStatus === "request_sent"}
                      onClick={async () => {
                        if (!token) return;

                        try {
                          if (entry.friendshipStatus === "request_received" && entry.friendshipId === null) {
                            throw new Error("Incoming friend request is missing its ID.");
                          }

                          if (entry.friendshipStatus === "request_received") {
                            await api.post(
                              `/api/friends/requests/${entry.friendshipId}/accept`,
                              {},
                              { headers: buildAuthHeaders(token) }
                            );

                            setUsers((prevUsers) =>
                              prevUsers.map((userEntry) =>
                                userEntry.id === entry.id
                                  ? { ...userEntry, friendshipStatus: "friends", friendshipId: null }
                                  : userEntry
                              )
                            );
                            setFriends((prevFriends) =>
                              prevFriends.some((friendItem) => friendItem.id === entry.id)
                                ? prevFriends
                                : [...prevFriends, { id: entry.id, username: entry.username, avatarUrl: entry.avatarUrl }]
                            );
                            return;
                          }

                          await api.post(
                            "/api/friends/requests",
                            { userId: entry.id },
                            { headers: buildAuthHeaders(token) }
                          );

                          setUsers((prevUsers) =>
                            prevUsers.map((userEntry) =>
                              userEntry.id === entry.id
                                ? { ...userEntry, friendshipStatus: "request_sent", friendshipId: null }
                                : userEntry
                            )
                          );
                        } catch (err) {
                          //console.error("Error handling friend request:", err);
                        }
                      }}
                    >
                      {entry.friendshipStatus === "request_received" ? "Accept" : "Add Friend"}
                    </Button>
                  )}

                  {entry.friendshipStatus === "request_received" && (
                    <Button
                      variant="danger"
                      size="small"
                      type="button"
                      disabled={entry.friendshipId === null}
                      onClick={async () => {
                        if (!token || entry.friendshipId === null) return;

                        try {
                          await api.delete(`/api/friends/requests/${entry.friendshipId}/deny`, {
                            headers: buildAuthHeaders(token),
                          });

                          setUsers((prevUsers) =>
                            prevUsers.map((userEntry) =>
                              userEntry.id === entry.id ? { ...userEntry, friendshipStatus: "none", friendshipId: null } : userEntry
                            )
                          );
                        } catch (err) {
                          //console.error("Error declining friend request:", err);
                        }
                      }}
                    >
                      Decline
                    </Button>
                  )}

                  <span className="text-sm text-gray-400">{STATUS_LABEL[entry.friendshipStatus as FriendshipStatus]}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ContactsPage;
