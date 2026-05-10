import os, sys
_backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(_backend_dir, ".env"))  # explicit path — works from any cwd

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import scan, chat, push, voice, family
from workers import reminder_runner

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router)
app.include_router(chat.router)
app.include_router(push.router)
app.include_router(voice.router)
app.include_router(family.router)

@app.on_event("startup")
def startup():
    reminder_runner.start()
