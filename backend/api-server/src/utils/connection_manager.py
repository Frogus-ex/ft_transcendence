from typing import Set
from fastapi import WebSocket

class ConnectionManager:
    """Manages WebSocket connections and broadcasts messages to all connected clients"""

    # Creating an empty set (duplicates not allowed) for user's websocket connection
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def   connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: str):
        # Wrapping the set into a list so it won't crash if exception is caught
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.active_connections.remove(connection)

manager = ConnectionManager()