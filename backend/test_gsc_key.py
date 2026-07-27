"""Diagnose GSC key file issue."""
import base64
import json
import sys

print(f"Python: {sys.version}")

with open(r'C:\Users\hemal\OneDrive\Documents\Default Project\backend\credentials\gsc_service_account.json') as f:
    data = json.load(f)

pk = data["private_key"]
pk_b64 = pk.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace("\n", "")
raw = base64.b64decode(pk_b64)
print(f"Key decoded: {len(raw)} bytes")
print(f"First 4 bytes hex: {raw[:4].hex()}")
print(f"Is PKCS8 (3082): {raw[:2] == b'\x30\x82'}")

# Try different loading approaches
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

pem_bytes = pk.encode("utf-8")

# Method 1: load_pem_private_key
try:
    key = serialization.load_pem_private_key(pem_bytes, password=None, backend=default_backend())
    print("Method 1 (load_pem_private_key): OK -", type(key).__name__)
except Exception as e:
    print(f"Method 1 FAILED: {e}")

# Method 2: Try with explicit backend
try:
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives.serialization import load_pem_private_key
    key = load_pem_private_key(pem_bytes, password=None)
    print("Method 2: OK")
except Exception as e:
    print(f"Method 2 FAILED: {e}")

# Check if pyOpenSSL works
try:
    from OpenSSL import crypto
    pkey = crypto.load_privatekey(crypto.FILETYPE_PEM, pem_bytes)
    print("Method 3 (pyOpenSSL): OK")
except ImportError:
    print("Method 3: pyOpenSSL not installed")
except Exception as e:
    print(f"Method 3 FAILED: {e}")

# Try converting to RSA private key format
try:
    from cryptography.hazmat.primitives.serialization import (
        Encoding, PrivateFormat, NoEncryption, PublicFormat
    )
    # Load as private key, then re-export as traditional RSA PEM
    key = serialization.load_pem_private_key(pem_bytes, password=None)
    rsa_pem = key.private_bytes(Encoding.PEM, PrivateFormat.TraditionalOpenSSL, NoEncryption())
    print(f"Re-exported as RSA PEM: {len(rsa_pem)} bytes")
    print(f"Starts with: {rsa_pem[:40]}")
except Exception as e:
    print(f"Re-export FAILED: {e}")
