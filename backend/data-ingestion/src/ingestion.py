# Initial ingestion test file

import asyncio
import websockets
import json

BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade"

# WIP, listen to Binance websocket
async def listen_binance():
	async with websockets.connect(BINANCE_WS_URL) as websocket:
		print("Connected to Binance websocket!")

	while True:
		try:
			msg = await websocket.recv()
			data = json.load(msg)

			symbol = data['s']
			price = float(data['p'])
			quantity = float(data['q'])
			trade_time = data['T']

			print(f"[{trade_time}] PRICE: {symbol}{price} | QTY: {quantity}")

		except Exception as e:
			print(f"Error: {e}")
			break

asyncio.run(listen_binance())