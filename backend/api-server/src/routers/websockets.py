from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from utils import manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSockets"])

# WebSocket (Cache)
@router.websocket("/markets/{symbol}")
async def   ws_market_data(websocket: WebSocket):
    """Opening a websocket pipeline and pushing ticks from Redis (every s/ms)"""

    logger.info("Opening websocket pipeline...")
    await websocket.accept(websocket)
    logging.info("Websocket pipeline is now opened!")

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.warning("Client disconnected. Removing the client...")
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Error: {e}")
        manager.disconnect(websocket)