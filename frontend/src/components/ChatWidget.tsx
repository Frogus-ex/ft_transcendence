import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MessageCircle, Send, X } from "lucide-react";
import { surfaceBackground, borderColor } from "../styles/tokens";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

type Friend = {
	id: number;
	username: string;
	avatarUrl: string | null;
};

type ChatMessage = {
	id: number;
	senderId: number;
	recipientId: number;
	content: string;
	createdAt: string;
	readAt: string | null;
};

const MESSAGE_REFRESH_INTERVAL_MS = 3000;

function ChatWidget() {
	const { user, token } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [friends, setFriends] = useState<Friend[]>([]);
	const [friendsLoading, setFriendsLoading] = useState(false);
	const [friendsError, setFriendsError] = useState("");
	const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [messagesLoading, setMessagesLoading] = useState(false);
	const [messagesError, setMessagesError] = useState("");
	const [messageText, setMessageText] = useState("");
	const [sending, setSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;

		const controller = new AbortController();
		api
			.get<Friend[]>("/api/friends", {
				headers: { Authorization: `Bearer ${token ?? ""}` },
				signal: controller.signal,
			})
			.then((response) => setFriends(response.data))
			.catch(() => {
				if (controller.signal.aborted) return;
				setFriends([]);
				setFriendsError("Could not load friends.");
			})
			.finally(() => {
				if (!controller.signal.aborted) setFriendsLoading(false);
			});

		return () => controller.abort();
	}, [isOpen, token]);

	useEffect(() => {
		if (!isOpen || !selectedFriend) return;

		const controller = new AbortController();
		let requestInProgress = false;

		const loadMessages = async () => {
			if (requestInProgress || controller.signal.aborted) return;
			requestInProgress = true;
			try {
				const response = await api.get<{ messages: ChatMessage[] }>(
					`/api/chat/${selectedFriend.id}/messages`,
					{
						headers: { Authorization: `Bearer ${token ?? ""}` },
						signal: controller.signal,
					}
				);
				setMessages(response.data.messages);
				setMessagesError("");
			} catch {
				if (!controller.signal.aborted) {
					setMessagesError("Could not load this conversation.");
				}
			} finally {
				requestInProgress = false;
				if (!controller.signal.aborted) setMessagesLoading(false);
			}
		};

		void loadMessages();
		const intervalId = window.setInterval(
			() => void loadMessages(),
			MESSAGE_REFRESH_INTERVAL_MS
		);

		return () => {
			window.clearInterval(intervalId);
			controller.abort();
		};
	}, [isOpen, selectedFriend, token]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const content = messageText.trim();
		if (!content || !selectedFriend || sending) return;

		setSending(true);
		setMessagesError("");
		try {
			const response = await api.post<ChatMessage>(
				`/api/chat/${selectedFriend.id}/messages`,
				{ content },
				{ headers: { Authorization: `Bearer ${token ?? ""}` } }
			);
			setMessages((current) => [...current, response.data]);
			setMessageText("");
		} catch {
			setMessagesError("Could not send your message. Please try again.");
		} finally {
			setSending(false);
		}
	}

	function closeWidget() {
		setIsOpen(false);
		setSelectedFriend(null);
		setMessages([]);
		setMessageText("");
	}

	if (!isOpen) {
		return (
			<button
				onClick={() => {
					setFriendsLoading(true);
					setFriendsError("");
					setIsOpen(true);
				}}
				aria-label="Open messages"
				className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg"
			>
				<MessageCircle size={24} />
			</button>
		);
	}

	return (
		<div
			className={
				surfaceBackground +
				" " +
				borderColor +
				" fixed bottom-6 right-6 w-80 h-96 border rounded-lg shadow-lg flex flex-col"
			}
		>
			<div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
				{selectedFriend && (
					<button
						onClick={() => {
							setSelectedFriend(null);
							setMessages([]);
							setMessagesError("");
						}}
						aria-label="Back to friends"
						className="text-gray-400 hover:text-white"
					>
						<ArrowLeft size={18} />
					</button>
				)}
				<span className="flex-1 truncate text-white font-semibold">
					{selectedFriend?.username ?? "Friends"}
				</span>
				<button onClick={closeWidget} aria-label="Close messages">
					<X size={18} className="text-gray-400" />
				</button>
			</div>

			{selectedFriend ? (
				<>
					<div className="flex-1 overflow-y-auto p-3">
						{messagesLoading ? (
							<div className="flex h-full items-center justify-center text-sm text-gray-400">
								Loading conversation...
							</div>
						) : messagesError && messages.length === 0 ? (
							<div className="flex h-full items-center justify-center text-center text-sm text-red-400">
								{messagesError}
							</div>
						) : messages.length === 0 ? (
							<div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
								No messages yet. Say hello!
							</div>
						) : (
							<div className="flex flex-col gap-2">
								{messages.map((message) => {
									const sentByCurrentUser = message.senderId === user?.id;
									return (
										<div
											key={message.id}
											className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
												sentByCurrentUser
													? "self-end bg-green-600 text-white"
													: "self-start bg-gray-700 text-white"
											}`}
										>
											<p className="break-words">{message.content}</p>
											<time className="mt-1 block text-right text-xs opacity-70">
												{new Date(message.createdAt).toLocaleTimeString([], {
													hour: "numeric",
													minute: "2-digit",
												})}
											</time>
										</div>
									);
								})}
								<div ref={messagesEndRef} />
							</div>
						)}
					</div>

					{messagesError && messages.length > 0 && (
						<p role="alert" className="px-3 text-xs text-red-400">
							{messagesError}
						</p>
					)}
					<form onSubmit={handleSendMessage} className="flex gap-2 border-t border-gray-800 p-3">
						<input
							value={messageText}
							onChange={(event) => setMessageText(event.target.value)}
							placeholder="Write a message..."
							aria-label="Message"
							maxLength={1000}
							className="min-w-0 flex-1 rounded bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
						/>
						<button
							type="submit"
							disabled={!messageText.trim() || sending}
							aria-label="Send message"
							className="rounded bg-green-600 p-2 text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Send size={16} />
						</button>
					</form>
				</>
			) : (
				<div className="flex-1 overflow-y-auto">
					{friendsLoading ? (
						<div className="flex h-full items-center justify-center text-sm text-gray-400">
							Loading friends...
						</div>
					) : friendsError ? (
						<div role="alert" className="flex h-full items-center justify-center px-4 text-center text-sm text-red-400">
							{friendsError}
						</div>
					) : friends.length === 0 ? (
						<div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-400">
							You don&apos;t have any friends to message yet.
						</div>
					) : (
						<div className="flex flex-col">
							{friends.map((friend) => (
								<button
									key={friend.id}
									onClick={() => {
										setMessages([]);
										setMessagesLoading(true);
										setMessagesError("");
										setSelectedFriend(friend);
									}}
									className="flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800"
								>
									<img
										src={friend.avatarUrl || "/default-avatar.png"}
										alt=""
										className="h-9 w-9 rounded-full object-cover"
									/>
									<span className="text-sm text-white">{friend.username}</span>
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default ChatWidget;
