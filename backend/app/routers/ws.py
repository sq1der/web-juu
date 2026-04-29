from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from app.config import settings
from app.ws.manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/booking/{booking_id}")
async def ws_booking(
    booking_id: str,
    websocket: WebSocket,
    token: str = Query(...)
):
    try:
        jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        await websocket.close(code=4001)
        return

    await manager.connect_booking(booking_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect_booking(booking_id, websocket)


@router.websocket("/ws/operator")
async def ws_operator(
    websocket: WebSocket,
    token: str = Query(...)
):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        owner_id = payload.get("user_id")
        if payload.get("role") != "owner":
            await websocket.close(code=4003)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    await manager.connect_operator(owner_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_operator(owner_id)