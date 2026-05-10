# This file initializes the Firebase Admin SDK once and exposes `db`,
# the Firestore client. Every other file that needs Firestore just does:
#   from services.firebase import db
#
#   1. Go to Firebase console then Project Settings then Service Accounts
#   2. Click "Generate new private key" and it download the JSON file
#   3. Save it somewhere safe (NOT inside the repo — it's a secret)
#   4. Add FIREBASE_CREDENTIALS_PATH=/path/to/that-file.json to your .env

import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# Guard: firebase_admin raises an error if you call initialize_app() more than once.
# This check makes it safe to import this file from multiple places.
if not firebase_admin._apps:
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if not cred_path:
        raise RuntimeError(
            "FIREBASE_CREDENTIALS_PATH not set in .env — "
            "download your service account JSON from the Firebase console."
        )
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

# `db` is the live Firestore client. Import and use it anywhere you need to
# read or write data. It's a module-level singleton — one connection, shared.
db = firestore.client()
