from __future__ import annotations

from datetime import datetime

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, or_, select, func, case, Select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from config import JWT_SECRET
from database.models import Friendships, Messages, Users
from database.orm_db import get_async_session

router = APIRouter(prefix="/api", tags=["friends"])
ALGORITHM = "HS256"
bearer_scheme = HTTPBearer()
FriendshipStatus = Literal["none", "friends", "request_sent", "request_received"]


def get_user_payload(token: str) -> int:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: AsyncSession = Depends(get_async_session),
) -> Users:
    user_id = get_user_payload(credentials.credentials)
    user = (await db.execute(select(Users).where(Users.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
    return user


async def ensure_friendship(db: AsyncSession, user_id: int, other_user_id: int) -> Friendships | None:
    low_id, high_id = sorted((user_id, other_user_id))
    return (
        await db.execute(
            select(Friendships).where(
                Friendships.user_low_id == low_id,
                Friendships.user_high_id == high_id,
                Friendships.status.is_(True),
            )
        )
    ).scalar_one_or_none()


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    avatarUrl: str | None = Field(default=None, validation_alias="avatar_url")


class FriendRequestBody(BaseModel):
    userId: int


class FriendMessageBody(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    senderId: int = Field(validation_alias="sender_id")
    recipientId: int = Field(validation_alias="recipient_id")
    content: str
    createdAt: datetime = Field(validation_alias="created_at")
    readAt: datetime | None = Field(default=None, validation_alias="read_at")

class UserSearchResult(BaseModel):
	id: int
	username: str
	avatarUrl: str | None = None
	friendshipStatus: FriendshipStatus
	friendshipId: int | None = None
 
 
class UserSearchResponse(BaseModel):
	users: list[UserSearchResult]


@router.get("/friends")
async def list_friends(db: AsyncSession = Depends(get_async_session), current_user: Users = Depends(get_current_user)):
    rows = (
        await db.execute(
            select(Friendships).where(
                or_(
                    and_(Friendships.user_low_id == current_user.id, Friendships.status.is_(True)),
                    and_(Friendships.user_high_id == current_user.id, Friendships.status.is_(True)),
                )
            )
        )
    ).scalars().all()

    friends: list[dict] = []
    for friendship in rows:
        friend_id = friendship.user_low_id if friendship.user_high_id == current_user.id else friendship.user_high_id
        friend = (await db.execute(select(Users).where(Users.id == friend_id))).scalar_one_or_none()
        if friend is None:
            continue
        friends.append(
            {
                "id": friend.id,
                "username": friend.username,
                "avatarUrl": friend.avatar_url,
                "friendsSince": friendship.created_at,
            }
        )

    return friends


@router.get("/friends/{user_id}/profile")
async def get_friend_profile(
    user_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    if await ensure_friendship(db, current_user.id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view friends' profiles.")

    friend = (await db.execute(select(Users).where(Users.id == user_id))).scalar_one_or_none()
    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    return {"id": friend.id, "username": friend.username, "avatarUrl": friend.avatar_url}


@router.get("/friends/requests")
async def list_friend_requests(db: AsyncSession = Depends(get_async_session), current_user: Users = Depends(get_current_user)):
    rows = (
        await db.execute(
            select(Friendships).where(
                or_(
                    Friendships.user_low_id == current_user.id,
                    Friendships.user_high_id == current_user.id,
                )
            )
        )
    ).scalars().all()

    incoming: list[dict] = []
    outgoing: list[dict] = []

    for friendship in rows:
        requester = (await db.execute(select(Users).where(Users.id == friendship.requester_id))).scalar_one_or_none()
        if requester is None:
            continue
        item = {
            "id": friendship.id,
            "requesterId": friendship.requester_id,
            "status": friendship.status,
            "createdAt": friendship.created_at,
            "user": {
                "id": requester.id,
                "username": requester.username,
                "avatarUrl": requester.avatar_url,
            },
        }

        if friendship.requester_id == current_user.id:
            outgoing.append(item)
        else:
            incoming.append(item)

    return {"incoming": incoming, "outgoing": outgoing}


@router.post("/friends/requests", status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    payload: FriendRequestBody,
    db: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    if payload.userId == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot add yourself as a friend.")

    recipient = (await db.execute(select(Users).where(Users.id == payload.userId))).scalar_one_or_none()
    if recipient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    low_id, high_id = sorted((current_user.id, payload.userId))
    existing = (
        await db.execute(
            select(Friendships).where(
                Friendships.user_low_id == low_id,
                Friendships.user_high_id == high_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        if existing.status:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Users are already friends.")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Friend request already exists.")

    friendship = Friendships(
        user_low_id=low_id,
        user_high_id=high_id,
        requester_id=current_user.id,
        status=False,
    )
    db.add(friendship)
    await db.commit()
    await db.refresh(friendship)

    return {
        "id": friendship.id,
        "status": friendship.status,
        "user": {"id": recipient.id, "username": recipient.username, "avatarUrl": recipient.avatar_url},
    }


@router.post("/friends/requests/{request_id}/accept")
async def accept_friend_request(
    request_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    friendship = (await db.execute(select(Friendships).where(Friendships.id == request_id))).scalar_one_or_none()
    if friendship is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found.")

    if friendship.status:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Friend request already accepted.")

    recipient_id = friendship.user_low_id if friendship.user_low_id != friendship.requester_id else friendship.user_high_id
    if recipient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the recipient can accept the request.")

    friendship.status = True
    await db.commit()
    await db.refresh(friendship)

    friend_id = friendship.user_low_id if friendship.user_high_id == current_user.id else friendship.user_high_id
    friend = (await db.execute(select(Users).where(Users.id == friend_id))).scalar_one_or_none()
    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")

    return {
        "id": friend.id,
        "username": friend.username,
        "avatarUrl": friend.avatar_url,
        "friendsSince": friendship.created_at,
    }


@router.delete("/friends/requests/{request_id}/deny", status_code=status.HTTP_204_NO_CONTENT)
async def deny_friend_request(
    request_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    friendship = (await db.execute(select(Friendships).where(Friendships.id == request_id))).scalar_one_or_none()
    if friendship is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found.")

    if friendship.requester_id == current_user.id or friendship.status:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot deny this friend request.")

    await db.delete(friendship)
    await db.commit()
    return None


@router.delete("/friends/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_friend(
    user_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    friendship = await ensure_friendship(db, current_user.id, user_id)
    if friendship is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not friends with this user.")

    await db.delete(friendship)
    await db.commit()
    return None


@router.get("/chat")
async def list_chats(db: AsyncSession = Depends(get_async_session), current_user: Users = Depends(get_current_user)):
    rows = (
        await db.execute(
            select(Messages)
            .where(or_(Messages.sender_id == current_user.id, Messages.recipient_id == current_user.id))
            .order_by(Messages.created_at.desc())
        )
    ).scalars().all()

    conversations: dict[int, dict] = {}
    for message in rows:
        other_id = message.recipient_id if message.sender_id == current_user.id else message.sender_id
        entry = conversations.setdefault(
            other_id,
            {
                "user": None,
                "lastMessage": None,
                "unreadCount": 0,
            },
        )
        if entry["lastMessage"] is None or message.created_at > entry["lastMessage"]["createdAt"]:
            entry["lastMessage"] = {
                "id": message.id,
                "senderId": message.sender_id,
                "recipientId": message.recipient_id,
                "content": message.content,
                "createdAt": message.created_at,
                "readAt": message.read_at,
            }
        if message.recipient_id == current_user.id and message.read_at is None:
            entry["unreadCount"] += 1

    chat_list: list[dict] = []
    for other_id, entry in conversations.items():
        friend = (await db.execute(select(Users).where(Users.id == other_id))).scalar_one_or_none()
        if friend is None:
            continue
        if await ensure_friendship(db, current_user.id, other_id) is None:
            continue
        entry["user"] = {"id": friend.id, "username": friend.username, "avatarUrl": friend.avatar_url}
        chat_list.append({"user": entry["user"], "lastMessage": entry["lastMessage"], "unreadCount": entry["unreadCount"]})

    chat_list.sort(key=lambda item: item["lastMessage"]["createdAt"] if item["lastMessage"] else datetime.min, reverse=True)
    return chat_list


@router.get("/chat/{user_id}/messages")
async def get_chat_messages(
    user_id: int,
    before: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    if await ensure_friendship(db, current_user.id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only message friends.")

    query = select(Messages).where(
        (
            (Messages.sender_id == current_user.id) & (Messages.recipient_id == user_id)
        )
        | (
            (Messages.sender_id == user_id) & (Messages.recipient_id == current_user.id)
        )
    )
    if before is not None:
        query = query.where(Messages.created_at < before)
    query = query.order_by(Messages.created_at.desc()).limit(limit)

    rows = (await db.execute(query)).scalars().all()

    messages = [
        {
            "id": message.id,
            "senderId": message.sender_id,
            "recipientId": message.recipient_id,
            "content": message.content,
            "createdAt": message.created_at,
            "readAt": message.read_at,
        }
        for message in rows
    ]
    return {"messages": list(reversed(messages))}


@router.post("/chat/{user_id}/messages")
async def send_chat_message(
    user_id: int,
    payload: FriendMessageBody,
    db: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    if await ensure_friendship(db, current_user.id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only message friends.")

    message = Messages(
        sender_id=current_user.id,
        recipient_id=user_id,
        content=payload.content.strip(),
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return {
        "id": message.id,
        "senderId": message.sender_id,
        "recipientId": message.recipient_id,
        "content": message.content,
        "createdAt": message.created_at,
        "readAt": message.read_at,
    }


 
 
def build_search_query(me: int, term: str, limit: int) -> Select:
	"""Users whose username contains `term`, each with their relationship to user `me`."""
	# A friendship row stores the pair sorted (low < high), so check both orders
	pair_with_me = or_(
		and_(Friendships.user_low_id == me, Friendships.user_high_id == Users.id),
		and_(Friendships.user_low_id == Users.id, Friendships.user_high_id == me),
	)
	friendship_status = case(
		(Friendships.id.is_(None), "none"),
		(Friendships.status.is_(True), "friends"),
		(Friendships.requester_id == me, "request_sent"),
		else_="request_received",
	).label("friendship_status")
	# Usernames that START with the term come first, then alphabetical
	starts_with = case((Users.username.istartswith(term, autoescape=True), 0), else_=1)
 
	return (
		select(
			Users.id,
			Users.username,
			Users.avatar_url,
			Friendships.id.label("friendship_id"),
			friendship_status,
		)
		.outerjoin(Friendships, pair_with_me)
		# autoescape: a user typing % or _ searches for those characters, not a wildcard
		.where(Users.id != me, Users.username.icontains(term, autoescape=True))
		.order_by(starts_with, func.lower(Users.username))
		.limit(limit)
	)
 
 
# Request:  Authorization: Bearer <token>, query ?search=<2-50 chars>&limit=<1-20, default 10>
# Response: { users: [{ id, username, avatarUrl, friendshipStatus, friendshipId }] }
@router.get("/users", response_model=UserSearchResponse)
async def search_users(
	current_user: Users = Depends(get_current_user),
	db: AsyncSession = Depends(get_async_session),
	search: str = Query(min_length=2, max_length=50),
	limit: Annotated[int, Query(ge=1, le=20)] = 10,
):
	term = search.strip()
	if len(term) < 2:
		raise HTTPException(status_code=422, detail="search must be at least 2 characters.")
 
	result = await db.execute(build_search_query(current_user.id, term, limit))
	return {
		"users": [
			{
				"id": row.id,
				"username": row.username,
				"avatarUrl": row.avatar_url,
				"friendshipStatus": row.friendship_status,
				"friendshipId": row.friendship_id,
			}
			for row in result.all()
		]
	}
