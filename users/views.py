"""
users/views.py
───────────────
Handles: Register, Login, Logout, Profile (GET/PATCH),
         Profile Image Upload, Address CRUD, Change Password.
"""

import uuid
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from firebase_config.firebase import db, bucket, Collections
from .serializers import (
    RegisterSerializer,
    BookNestTokenObtainSerializer,
    UserProfileSerializer,
    AddressSerializer,
    ChangePasswordSerializer,
    hash_password,
    check_password,
)


# ── Register ───────────────────────────────────────────────────────────────

class RegisterView(APIView):
    """POST /api/v1/auth/register/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.create(serializer.validated_data)
        return Response(
            {"message": "Account created successfully.", "user_id": user["user_id"]},
            status=status.HTTP_201_CREATED,
        )


# ── Login ──────────────────────────────────────────────────────────────────

class LoginView(APIView):
    """POST /api/v1/auth/login/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = BookNestTokenObtainSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


# ── Logout ─────────────────────────────────────────────────────────────────

class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the refresh token so it can no longer be used.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)


# ── Profile ────────────────────────────────────────────────────────────────

class ProfileView(APIView):
    """GET / PATCH /api/v1/auth/profile/"""
    permission_classes = [IsAuthenticated]

    def _get_user_data(self, user_id):
        doc = db.collection(Collections.USERS).document(user_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["user_id"] = user_id
        data.pop("password", None)   # never expose hashed password
        return data

    def get(self, request):
        data = self._get_user_data(request.user.user_id)
        if data is None:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)

    def patch(self, request):
        serializer = UserProfileSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.update(request.user.user_id, serializer.validated_data)
        return Response({"message": "Profile updated."})


# ── Profile Image Upload ───────────────────────────────────────────────────

class ProfileImageUploadView(APIView):
    """
    POST /api/v1/auth/profile/image/
    Accepts a multipart/form-data file under the key 'image'.
    Uploads to Firebase Storage and saves the public URL to Firestore.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        image_file = request.FILES.get("image")
        if not image_file:
            return Response(
                {"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Upload to Firebase Storage
        ext        = image_file.name.rsplit(".", 1)[-1]
        blob_name  = f"profile_images/{request.user.user_id}.{ext}"
        blob       = bucket.blob(blob_name)
        blob.upload_from_file(image_file, content_type=image_file.content_type)
        blob.make_public()

        # Save public URL to Firestore
        image_url = blob.public_url
        db.collection(Collections.USERS).document(request.user.user_id).update(
            {"profile_image": image_url}
        )
        return Response({"profile_image": image_url})


# ── Change Password ────────────────────────────────────────────────────────

class ChangePasswordView(APIView):
    """POST /api/v1/auth/change-password/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        doc = db.collection(Collections.USERS).document(request.user.user_id).get()
        user_data = doc.to_dict()

        if not check_password(
            serializer.validated_data["old_password"], user_data.get("password", "")
        ):
            return Response(
                {"error": "Old password is incorrect."}, status=status.HTTP_400_BAD_REQUEST
            )

        db.collection(Collections.USERS).document(request.user.user_id).update(
            {"password": hash_password(serializer.validated_data["new_password"])}
        )
        return Response({"message": "Password changed successfully."})


# ── Addresses ─────────────────────────────────────────────────────────────

class AddressListCreateView(APIView):
    """GET / POST /api/v1/auth/addresses/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        docs = (
            db.collection(Collections.ADDRESSES)
            .where("user_id", "==", request.user.user_id)
            .get()
        )
        addresses = [{**d.to_dict(), "address_id": d.id} for d in docs]
        return Response(addresses)

    def post(self, request):
        serializer = AddressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        address = serializer.create(request.user.user_id, serializer.validated_data)
        return Response(address, status=status.HTTP_201_CREATED)


class AddressDetailView(APIView):
    """GET / PATCH / DELETE /api/v1/auth/addresses/<address_id>/"""
    permission_classes = [IsAuthenticated]

    def _get_address(self, address_id, user_id):
        doc = db.collection(Collections.ADDRESSES).document(address_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        # Ensure the address belongs to the requesting user
        if data.get("user_id") != user_id:
            return None
        data["address_id"] = address_id
        return data

    def get(self, request, address_id):
        address = self._get_address(address_id, request.user.user_id)
        if address is None:
            return Response({"error": "Address not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(address)

    def patch(self, request, address_id):
        address = self._get_address(address_id, request.user.user_id)
        if address is None:
            return Response({"error": "Address not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AddressSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated = serializer.update(address_id, serializer.validated_data)
        return Response(updated)

    def delete(self, request, address_id):
        address = self._get_address(address_id, request.user.user_id)
        if address is None:
            return Response({"error": "Address not found."}, status=status.HTTP_404_NOT_FOUND)
        db.collection(Collections.ADDRESSES).document(address_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
