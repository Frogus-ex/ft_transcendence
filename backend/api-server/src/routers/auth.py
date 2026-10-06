from fastapi import APIRouter

router = APIRouter(prefix="/api/")


# Request { email, username, password }
# Response { userId }
@router.post("auth/register")
def register(email: str, username: str, password: str):
	return

# Request { email, password }
# Response { token, user: { id, username, avatarUrl } }
@router.post("auth/login")
def login(email: str, password: str):
	return

# Request authorization header, 
# Response { id, username, email, avatarUrl, createdAt }
@router.get("users/me")
def profile():
	return {"Hello World"}
