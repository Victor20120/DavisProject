"""Run once to generate VAPID keys for Web Push.

    python generate_vapid_keys.py

Copy the output into backend/.env AND frontend/.env.
"""
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
import base64

key = ec.generate_private_key(ec.SECP256R1(), default_backend())

private_raw = key.private_numbers().private_value.to_bytes(32, 'big')
public_raw  = key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)

private_b64 = base64.urlsafe_b64encode(private_raw).rstrip(b'=').decode()
public_b64  = base64.urlsafe_b64encode(public_raw).rstrip(b'=').decode()

print("── Add to backend/.env ────────────────────────────")
print(f"VAPID_PUBLIC_KEY={public_b64}")
print(f"VAPID_PRIVATE_KEY={private_b64}")
print()
print("── Add to frontend/.env ───────────────────────────")
print(f"VITE_VAPID_PUBLIC_KEY={public_b64}")
