from dotenv import load_dotenv
load_dotenv()  # must be first — loads .env before any service creates API clients

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import scan, chat

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router)
app.include_router(chat.router)  # POST /chat
