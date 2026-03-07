"""
authentication/backends.py
───────────────────────────
Custom DRF authentication class.

Flow:
  1. Client sends `Authorization: Bearer <access_token>` header.
  2. We decode the JWT and extract `user_id` from its payload.
  3. We fetch the user document from Firestore.
  4. We return a lightweight FirestoreUser object that DRF can use
     in `request.user` throughout the rest of the request cycle.
"""

from rest_framework import authentication, exceptions
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from firebase_config.firebase import db, Collections


class FirestoreUser:
    """
    Minimal user object attached to request.user.
    Mimics enough of Django's AbstractUser interface for DRF to work.
    """

    is_anonymous = False
    is_authenticated = True

    def __init__(self, data: dict):
        self.user_id        = data.get("user_id")
        self.username       = data.get("username", "")
        self.email          = data.get("email", "")
        self.phone          = data.get("phone", "")
        self.profile_image  = data.get("profile_image", "")
        self.created_at     = data.get("created_at")
        self.is_admin       = data.get("is_admin", False)

    # DRF permission checks use this
    @property
    def pk(self):
        return self.user_id

    def __str__(self):
        return self.email


class FirestoreJWTAuthentication(authentication.BaseAuthentication):
    """
    Validates a SimpleJWT access token and loads the user from Firestore.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return None  # Let other auth classes handle it (or return 401)

        raw_token = auth_header.split(" ", 1)[1].strip()

        # ── Decode & validate the JWT ──────────────────────────────────────
        try:
            validated_token = AccessToken(raw_token)
        except (TokenError, InvalidToken) as exc:
            raise exceptions.AuthenticationFailed(f"Invalid token: {exc}")

        user_id = validated_token.get("user_id")
        if not user_id:
            raise exceptions.AuthenticationFailed("Token missing user_id claim.")

        # ── Fetch user from Firestore ──────────────────────────────────────
        doc = db.collection(Collections.USERS).document(user_id).get()
        if not doc.exists:
            raise exceptions.AuthenticationFailed("User not found.")

        user_data = doc.to_dict()
        user_data["user_id"] = user_id  # attach the doc ID

        return (FirestoreUser(user_data), validated_token)

    def authenticate_header(self, request):
        return "Bearer"
