# Initial ingestion test file

import asyncio
import websockets
import json

BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade"

# WIP, listen to Binance websocket