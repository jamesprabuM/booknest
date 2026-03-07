"""
payments/views.py
──────────────────
Razorpay payment integration.

Flow:
  1. POST /payments/create/        → creates a Razorpay order; returns order_id + key
  2. Frontend opens Razorpay checkout popup
  3. POST /payments/verify/        → verifies HMAC signature; marks order as Paid
  4. GET  /payments/<order_id>/    → fetch payment record for an order
"""

import uuid
import hmac
import hashlib
from datetime import datetime, timezone

import razorpay
from django.conf import settings

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from firebase_config.firebase import db, Collections


def _razorpay_client():
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


class CreatePaymentView(APIView):
    """
    POST /api/v1/payments/create/
    Body: { "order_id": "<booknest_order_id>" }

    Creates a Razorpay order and returns the details needed to
    open the Razorpay checkout popup on the frontend.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        if not order_id:
            return Response({"error": "order_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch order from Firestore
        order_doc = db.collection(Collections.ORDERS).document(order_id).get()
        if not order_doc.exists:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        order = order_doc.to_dict()
        if order["user_id"] != request.user.user_id:
            return Response({"error": "Not authorised."}, status=status.HTTP_403_FORBIDDEN)

        if order["payment_status"] == "Paid":
            return Response({"error": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)

        # Razorpay amount is in paise (1 INR = 100 paise)
        amount_paise = int(float(order["total_amount"]) * 100)

        client = _razorpay_client()
        rz_order = client.order.create({
            "amount":   amount_paise,
            "currency": "INR",
            "receipt":  order_id,
            "notes":    {"booknest_order_id": order_id},
        })

        # Store Razorpay order ID on the order document for verification later
        db.collection(Collections.ORDERS).document(order_id).update(
            {"razorpay_order_id": rz_order["id"]}
        )

        return Response({
            "razorpay_order_id": rz_order["id"],
            "razorpay_key_id":   settings.RAZORPAY_KEY_ID,
            "amount":            amount_paise,
            "currency":          "INR",
            "order_id":          order_id,
        })


class VerifyPaymentView(APIView):
    """
    POST /api/v1/payments/verify/
    Body:
      {
        "razorpay_order_id":   "...",
        "razorpay_payment_id": "...",
        "razorpay_signature":  "...",
        "order_id":            "<booknest_order_id>"
      }

    Validates the HMAC-SHA256 signature provided by Razorpay.
    If valid, marks the order and payment as Paid.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        rz_order_id   = request.data.get("razorpay_order_id")
        rz_payment_id = request.data.get("razorpay_payment_id")
        rz_signature  = request.data.get("razorpay_signature")
        order_id      = request.data.get("order_id")

        if not all([rz_order_id, rz_payment_id, rz_signature, order_id]):
            return Response({"error": "Missing payment verification fields."}, status=400)

        # ── HMAC verification ──────────────────────────────────────────────
        body        = f"{rz_order_id}|{rz_payment_id}"
        expected_sig = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            body.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, rz_signature):
            return Response({"error": "Payment signature verification failed."},
                            status=status.HTTP_400_BAD_REQUEST)

        # ── Update Order ───────────────────────────────────────────────────
        db.collection(Collections.ORDERS).document(order_id).update({
            "payment_status":    "Paid",
            "order_status":      "Paid",
            "razorpay_payment_id": rz_payment_id,
        })

        # ── Create Payment record ──────────────────────────────────────────
        payment_id = str(uuid.uuid4())
        now        = datetime.now(timezone.utc).isoformat()
        order_doc  = db.collection(Collections.ORDERS).document(order_id).get().to_dict()

        db.collection(Collections.PAYMENTS).document(payment_id).set({
            "payment_id":          payment_id,
            "order_id":            order_id,
            "payment_method":      "Razorpay",
            "amount":              order_doc.get("total_amount"),
            "payment_status":      "Paid",
            "razorpay_payment_id": rz_payment_id,
            "razorpay_order_id":   rz_order_id,
            "payment_date":        now,
        })

        return Response({
            "message":    "Payment successful.",
            "payment_id": payment_id,
            "order_id":   order_id,
        })


class PaymentDetailView(APIView):
    """GET /api/v1/payments/<order_id>/ – fetch payment record for an order."""
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        # Security check: verify the order belongs to this user
        order_doc = db.collection(Collections.ORDERS).document(order_id).get()
        if not order_doc.exists:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        order = order_doc.to_dict()
        if order["user_id"] != request.user.user_id and not getattr(request.user, "is_admin", False):
            return Response({"error": "Not authorised."}, status=status.HTTP_403_FORBIDDEN)

        payments = (
            db.collection(Collections.PAYMENTS)
            .where("order_id", "==", order_id)
            .limit(1)
            .get()
        )
        if not payments:
            return Response({"error": "Payment record not found."}, status=status.HTTP_404_NOT_FOUND)

        payment = {**payments[0].to_dict(), "payment_id": payments[0].id}
        return Response(payment)
