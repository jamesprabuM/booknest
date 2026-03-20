"""
users/serializers.py
─────────────────────
Serializers for user registration, login, profile and address management.
Also overrides the SimpleJWT token obtain serializer to work with Firestore.
"""

import uuid
import hashlib
from datetime import datetime, timezone

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from firebase_config.firebase import db, Collections


# ── Helpers ────────────────────────────────────────────────────────────────

def hash_password(raw_password: str) -> str:
    """SHA-256 hash. Use bcrypt/argon2 in production."""
    return hashlib.sha256(raw_password.encode()).hexdigest()


def check_password(raw_password: str, hashed: str) -> bool:
    return hash_password(raw_password) == hashed


# ── Register ───────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    username  = serializers.CharField(max_length=150)
    email     = serializers.EmailField()
    password  = serializers.CharField(write_only=True, min_length=8)
    phone     = serializers.CharField(max_length=15, required=False, allow_blank=True, default="")

    def validate_email(self, value):
        """Ensure email is not already registered."""
        existing = (
            db.collection(Collections.USERS)
            .where("email", "==", value)
            .limit(1)
            .get()
        )
        if existing:
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        user_id = str(uuid.uuid4())
        now     = datetime.now(timezone.utc).isoformat()
        user_doc = {
            "username":      validated_data["username"],
            "email":         validated_data["email"],
            "password":      hash_password(validated_data["password"]),
            "phone":         validated_data.get("phone", ""),
            "profile_image": "",
            "is_admin":      False,
            "created_at":    now,
        }
        db.collection(Collections.USERS).document(user_id).set(user_doc)

        # Auto-create an empty cart and wishlist for the new user
        cart_id     = str(uuid.uuid4())
        wishlist_id = str(uuid.uuid4())
        db.collection(Collections.CARTS).document(cart_id).set(
            {"user_id": user_id, "created_at": now}
        )
        db.collection(Collections.WISHLISTS).document(wishlist_id).set(
            {"user_id": user_id}
        )

        user_doc["user_id"] = user_id
        return user_doc


# ── Login (custom SimpleJWT obtain serializer) ─────────────────────────────

class BookNestTokenObtainSerializer(serializers.Serializer):
    """
    Replaces SimpleJWT's default TokenObtainPairSerializer.
    Authenticates against Firestore instead of Django's User model.
    """
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email    = attrs["email"]
        password = attrs["password"]

        # Look up user in Firestore by email
        docs = (
            db.collection(Collections.USERS)
            .where("email", "==", email)
            .limit(1)
            .get()
        )
        if not docs:
            raise serializers.ValidationError("Invalid email or password.")

        doc      = docs[0]
        user_data = doc.to_dict()
        user_id  = doc.id

        if not check_password(password, user_data.get("password", "")):
            raise serializers.ValidationError("Invalid email or password.")

        # Build token directly without ORM user (Firestore-based auth)
        refresh = RefreshToken()
        refresh["user_id"] = user_id

        return {
            "refresh": str(refresh),
            "access":  str(refresh.access_token),
            "user": {
                "user_id":  user_id,
                "username": user_data.get("username"),
                "email":    user_data.get("email"),
                "phone":    user_data.get("phone"),
                "is_admin": user_data.get("is_admin", False),
            },
        }


# ── Profile ────────────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.Serializer):
    user_id       = serializers.CharField(read_only=True)
    username      = serializers.CharField(max_length=150)
    email         = serializers.EmailField(read_only=True)   # cannot change email
    phone         = serializers.CharField(max_length=15, required=False, allow_blank=True)
    profile_image = serializers.CharField(read_only=True)    # updated via separate upload
    created_at    = serializers.CharField(read_only=True)

    def update(self, user_id, validated_data):
        db.collection(Collections.USERS).document(user_id).update(
            {k: v for k, v in validated_data.items() if k not in ("email", "user_id")}
        )
        return validated_data


# ── Address ────────────────────────────────────────────────────────────────

class AddressSerializer(serializers.Serializer):
    address_id = serializers.CharField(read_only=True)
    full_name  = serializers.CharField(max_length=200)
    phone      = serializers.CharField(max_length=15)
    house_no   = serializers.CharField(max_length=50)
    street     = serializers.CharField(max_length=200)
    city       = serializers.CharField(max_length=100)
    state      = serializers.CharField(max_length=100)
    pincode    = serializers.CharField(max_length=10)
    country    = serializers.CharField(max_length=100, default="India")

    def create(self, user_id, validated_data):
        address_id = str(uuid.uuid4())
        validated_data.update({"user_id": user_id, "address_id": address_id})
        db.collection(Collections.ADDRESSES).document(address_id).set(validated_data)
        return validated_data

    def update(self, address_id, validated_data):
        db.collection(Collections.ADDRESSES).document(address_id).update(validated_data)
        validated_data["address_id"] = address_id
        return validated_data


# ── Change Password ────────────────────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
