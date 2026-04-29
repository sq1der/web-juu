from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        self.booking_connections: Dict[str, List[WebSocket]] = {}
        self.operator_connections: Dict[str, WebSocket] = {}

    async def connect_booking(self, booking_id: str, websocket: WebSocket):
        await websocket.accept()
        self.booking_connections.setdefault(booking_id, []).append(websocket)

    async def connect_operator(self, owner_id: str, websocket: WebSocket):
        await websocket.accept()
        self.operator_connections[owner_id] = websocket

    async def disconnect_booking(self, booking_id: str, websocket: WebSocket):
        conns = self.booking_connections.get(booking_id, [])
        if websocket in conns:
            conns.remove(websocket)

    def disconnect_operator(self, owner_id: str):
        self.operator_connections.pop(owner_id, None)

    async def send_booking_update(self, booking_id: str, data: dict):
        for ws in self.booking_connections.get(booking_id, []):
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                pass

    async def send_operator_update(self, owner_id: str, data: dict):
        ws = self.operator_connections.get(owner_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                pass

manager = ConnectionManager()