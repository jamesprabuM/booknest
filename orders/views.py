"""
orders/views.py
────────────────
Handles order placement (checkout), order history, order detail,
and admin order status updates.

Checkout flow:
  1. User POSTs to /orders/checkout/ with address_id & payment_mode.
  2. We validate cart is not empty and all items are in stock.
  3. We create an Order + OrderItems in Firestore.
  4. We decrement stock for each product.
  5. We clear the user's cart.
  6. The frontend then calls /payments/create/ to initiate Razorpay.
"""

import uuid
from datetime import datetime, timezone

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from firebase_config.firebase import db, Collections


ORDER_STATUSES = ["Pending", "Paid", "Shipped", "Delivered", "Cancelled"]


def _is_admin(request):
    return getattr(request.user, "is_admin", False)


# ── Checkout ───────────────────────────────────────────────────────────────

class CheckoutView(APIView):
    """
    POST /api/v1/orders/checkout/
    Body: { "address_id": "...", "payment_mode": "Razorpay" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        address_id   = request.data.get("address_id")
        payment_mode = request.data.get("payment_mode", "Razorpay")

        if not address_id:
            return Response({"error": "address_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify address belongs to user
        addr_doc = db.collection(Collections.ADDRESSES).document(address_id).get()
        if not addr_doc.exists or addr_doc.to_dict().get("user_id") != request.user.user_id:
            return Response({"error": "Address not found."}, status=status.HTTP_404_NOT_FOUND)

        # Get user's cart
        cart_docs = (
            db.collection(Collections.CARTS)
            .where("user_id", "==", request.user.user_id)
            .limit(1)
            .get()
        )
        if not cart_docs:
            return Response({"error": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)
        cart_id = cart_docs[0].id

        # Get cart items
        cart_items = (
            db.collection(Collections.CART_ITEMS)
            .where("cart_id", "==", cart_id)
            .get()
        )
        if not cart_items:
            return Response({"error": "Cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate stock and calculate total
        order_items_data = []
        total_amount     = 0.0

        for ci in cart_items:
            ci_data    = ci.to_dict()
            product_id = ci_data["product_id"]
            quantity   = ci_data["quantity"]

            prod_doc = db.collection(Collections.PRODUCTS).document(product_id).get()
            if not prod_doc.exists:
                return Response(
                    {"error": f"Product {product_id} no longer exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            prod = prod_doc.to_dict()
            if prod.get("stock", 0) < quantity:
                return Response(
                    {"error": f"'{prod['name']}' only has {prod['stock']} copies left."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            price        = float(prod.get("price", 0))
            total_amount += price * quantity
            order_items_data.append({
                "product_id":   product_id,
                "quantity":     quantity,
                "price":        price,
                "product_name": prod.get("name"),
            })

        # ── Create Order ───────────────────────────────────────────────────
        order_id = str(uuid.uuid4())
        now      = datetime.now(timezone.utc).isoformat()

        db.collection(Collections.ORDERS).document(order_id).set({
            "order_id":       order_id,
            "user_id":        request.user.user_id,
            "address_id":     address_id,
            "total_amount":   round(total_amount, 2),
            "payment_mode":   payment_mode,
            "payment_status": "Pending",
            "order_status":   "Pending",
            "created_at":     now,
        })

        # ── Create OrderItems & decrement stock ────────────────────────────
        for item in order_items_data:
            item_id = str(uuid.uuid4())
            db.collection(Collections.ORDER_ITEMS).document(item_id).set({
                "order_item_id": item_id,
                "order_id":      order_id,
                "product_id":    item["product_id"],
                "quantity":      item["quantity"],
                "price":         item["price"],
            })
            # Decrement stock
            db.collection(Collections.PRODUCTS).document(item["product_id"]).update(
                {"stock": db.field_path("stock")}  # handled below properly
            )
            prod_ref = db.collection(Collections.PRODUCTS).document(item["product_id"])
            prod_snap = prod_ref.get().to_dict()
            prod_ref.update({"stock": prod_snap["stock"] - item["quantity"]})

        # ── Clear Cart ─────────────────────────────────────────────────────
        for ci in cart_items:
            ci.reference.delete()

        return Response({
            "message":      "Order placed successfully.",
            "order_id":     order_id,
            "total_amount": round(total_amount, 2),
        }, status=status.HTTP_201_CREATED)


# ── Order List ─────────────────────────────────────────────────────────────

class OrderListView(APIView):
    """
    GET /api/v1/orders/
    Regular users see only their own orders.
    Admins see all orders.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if _is_admin(request):
            docs = db.collection(Collections.ORDERS).order_by("created_at", direction="DESCENDING").get()
        else:
            docs = (
                db.collection(Collections.ORDERS)
                .where("user_id", "==", request.user.user_id)
                .get()
            )
        orders = [{**d.to_dict(), "order_id": d.id} for d in docs]
        return Response(orders)


# ── Order Detail ───────────────────────────────────────────────────────────

class OrderDetailView(APIView):
    """GET /api/v1/orders/<order_id>/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        doc = db.collection(Collections.ORDERS).document(order_id).get()
        if not doc.exists:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        order = {**doc.to_dict(), "order_id": order_id}

        # Security: regular users can only view their own orders
        if not _is_admin(request) and order["user_id"] != request.user.user_id:
            return Response({"error": "Not authorised."}, status=status.HTTP_403_FORBIDDEN)

        # Attach order items
        item_docs = (
            db.collection(Collections.ORDER_ITEMS)
            .where("order_id", "==", order_id)
            .get()
        )
        items = [{**d.to_dict(), "order_item_id": d.id} for d in item_docs]
        order["items"] = items

        # Attach address snapshot
        addr_doc = db.collection(Collections.ADDRESSES).document(order["address_id"]).get()
        if addr_doc.exists:
            order["address"] = addr_doc.to_dict()

        return Response(order)


# ── Admin: Update Order Status ─────────────────────────────────────────────

class OrderStatusUpdateView(APIView):
    """
    PATCH /api/v1/orders/<order_id>/status/
    Body: { "order_status": "Shipped" }
    Admin only.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, order_id):
        if not _is_admin(request):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get("order_status")
        if new_status not in ORDER_STATUSES:
            return Response(
                {"error": f"Invalid status. Must be one of: {ORDER_STATUSES}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doc = db.collection(Collections.ORDERS).document(order_id).get()
        if not doc.exists:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        db.collection(Collections.ORDERS).document(order_id).update(
            {"order_status": new_status}
        )
        return Response({"message": f"Order status updated to '{new_status}'."})


# ── Cancel Order ───────────────────────────────────────────────────────────

class OrderCancelView(APIView):
    """
    POST /api/v1/orders/<order_id>/cancel/
    Users can cancel their own Pending orders.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        doc = db.collection(Collections.ORDERS).document(order_id).get()
        if not doc.exists:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        order = doc.to_dict()
        if order["user_id"] != request.user.user_id and not _is_admin(request):
            return Response({"error": "Not authorised."}, status=status.HTTP_403_FORBIDDEN)

        if order["order_status"] not in ("Pending", "Paid"):
            return Response(
                {"error": "Only Pending or Paid orders can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Restore stock
        item_docs = (
            db.collection(Collections.ORDER_ITEMS)
            .where("order_id", "==", order_id)
            .get()
        )
        for item_doc in item_docs:
            item = item_doc.to_dict()
            prod_ref = db.collection(Collections.PRODUCTS).document(item["product_id"])
            prod_snap = prod_ref.get().to_dict()
            prod_ref.update({"stock": prod_snap["stock"] + item["quantity"]})

        db.collection(Collections.ORDERS).document(order_id).update(
            {"order_status": "Cancelled", "payment_status": "Refunded"}
        )
        return Response({"message": "Order cancelled and stock restored."})
