from typing import Any
from fastapi import WebSocket

class ConnectionManager:
    """Manages WebSocket connections and broadcasts messages to all connected clients"""

    def __init__(self):
        self.active_connections: dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, symbol: str):
        await websocket.accept()
        self.active_connections[websocket] = symbol.upper()

    def disconnect(self, websocket: WebSocket):
        self.active_connections.pop(websocket, None)

    async def broadcast(self, symbol: str, message: Any):
        for connection, client_symbol in list(self.active_connections.items()):
            if client_symbol.upper() == symbol.upper():
                try:
                    if isinstance(message, (dict, list)):
                        await connection.send_json(message)
                    else:
                        await connection.send_text(str(message))
                except Exception:
                    self.disconnect(connection)

manager = ConnectionManager()