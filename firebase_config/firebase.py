"""
firebase_config/firebase.py
────────────────────────────
Initialises the Firebase Admin SDK once at startup.

Usage anywhere in the project:
    from firebase_config.firebase import db, bucket

    doc = db.collection("users").document(uid).get()
    blob = bucket.blob("covers/my-book.jpg")
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore, storage
from django.conf import settings


def _init_firebase() -> None:
    """Initialise Firebase Admin SDK if not already done."""
    if firebase_admin._apps:
        return  # already initialised – do nothing

    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if not os.path.exists(cred_path):
        raise FileNotFoundError(
            f"Firebase credentials not found at '{cred_path}'. "
            "Download the service account JSON from Firebase Console → "
            "Project Settings → Service Accounts → Generate new private key."
        )

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(
        cred,
        {"storageBucket": settings.FIREBASE_STORAGE_BUCKET},
    )


# ── Initialise on import ────────────────────────────────────────────────────
_init_firebase()

# ── Public helpers ──────────────────────────────────────────────────────────
db: firestore.Client = firestore.client()          # Firestore client
bucket = storage.bucket()                          # Firebase Storage bucket


# ── Firestore collection names (single source of truth) ────────────────────
class Collections:
    USERS        = "users"
    ADDRESSES    = "addresses"
    CATEGORIES   = "categories"
    PRODUCTS     = "products"
    CARTS        = "carts"
    CART_ITEMS   = "cart_items"
    WISHLISTS    = "wishlists"
    WISHLIST_ITEMS = "wishlist_items"
    ORDERS       = "orders"
    ORDER_ITEMS  = "order_items"
    PAYMENTS     = "payments"
