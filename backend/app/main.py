from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, cars, carwashes, bookings, operator, ws, users, favorites, reviews

app = FastAPI(title="JUU API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(cars.router, prefix="/api/v1")
app.include_router(carwashes.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(favorites.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(operator.router, prefix="/api/v1")
app.include_router(ws.router)

@app.get("/health")
async def health():
    return {"status": "ok"}