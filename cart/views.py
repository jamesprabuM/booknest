"""
cart/views.py
──────────────
Cart is auto-created on registration (one per user).
CartItems can be added, updated (quantity), or removed.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from firebase_config.firebase import db, Collections
import uuid


def _get_user_cart(user_id: str):
    """Return the cart document for the given user."""
    docs = (
        db.collection(Collections.CARTS)
        .where("user_id", "==", user_id)
        .limit(1)
        .get()
    )
    if not docs:
        return None, None
    doc = docs[0]
    return doc.id, doc.to_dict()


def _get_cart_items(cart_id: str):
    """Return all items in a cart, including product details."""
    docs = (
        db.collection(Collections.CART_ITEMS)
        .where("cart_id", "==", cart_id)
        .get()
    )
    items = []
    total = 0.0
    for d in docs:
        item = {**d.to_dict(), "cart_item_id": d.id}
        # Attach product snapshot for convenience
        prod_doc = db.collection(Collections.PRODUCTS).document(item["product_id"]).get()
        if prod_doc.exists:
            prod = prod_doc.to_dict()
            item["product"] = {
                "name":   prod.get("name"),
                "author": prod.get("author"),
                "price":  prod.get("price"),
                "image":  prod.get("image"),
                "stock":  prod.get("stock"),
            }
            total += prod.get("price", 0) * item.get("quantity", 1)
        items.append(item)
    return items, round(total, 2)


# ── Cart ───────────────────────────────────────────────────────────────────

class CartView(APIView):
    """GET /api/v1/cart/ – returns cart contents with subtotals."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart_id, cart = _get_user_cart(request.user.user_id)
        if not cart_id:
            return Response({"error": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)

        items, total = _get_cart_items(cart_id)
        return Response({
            "cart_id":    cart_id,
            "items":      items,
            "total":      total,
            "item_count": len(items),
        })


# ── Cart Items ─────────────────────────────────────────────────────────────

class CartItemAddView(APIView):
    """
    POST /api/v1/cart/items/
    Body: { "product_id": "...", "quantity": 2 }
    If the book is already in the cart, quantity is incremented.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get("product_id")
        quantity   = int(request.data.get("quantity", 1))

        if not product_id:
            return Response({"error": "product_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if quantity < 1:
            return Response({"error": "quantity must be at least 1."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate product exists and has enough stock
        prod_doc = db.collection(Collections.PRODUCTS).document(product_id).get()
        if not prod_doc.exists:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        prod = prod_doc.to_dict()
        if prod.get("stock", 0) < quantity:
            return Response(
                {"error": f"Only {prod['stock']} copies available."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart_id, _ = _get_user_cart(request.user.user_id)
        if not cart_id:
            return Response({"error": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if item already exists in cart
        existing = (
            db.collection(Collections.CART_ITEMS)
            .where("cart_id", "==", cart_id)
            .where("product_id", "==", product_id)
            .limit(1)
            .get()
        )
        if existing:
            # Increment quantity
            existing_doc = existing[0]
            new_qty = existing_doc.to_dict()["quantity"] + quantity
            existing_doc.reference.update({"quantity": new_qty})
            return Response({"message": "Cart updated.", "quantity": new_qty})

        # New item
        item_id = str(uuid.uuid4())
        db.collection(Collections.CART_ITEMS).document(item_id).set({
            "cart_item_id": item_id,
            "cart_id":      cart_id,
            "product_id":   product_id,
            "quantity":     quantity,
        })
        return Response({"message": "Item added to cart.", "cart_item_id": item_id},
                        status=status.HTTP_201_CREATED)


class CartItemUpdateView(APIView):
    """
    PATCH  /api/v1/cart/items/<cart_item_id>/  – update quantity
    DELETE /api/v1/cart/items/<cart_item_id>/  – remove item
    """
    permission_classes = [IsAuthenticated]

    def _get_item(self, cart_item_id, user_id):
        """Returns item doc if it belongs to the user's cart."""
        doc = db.collection(Collections.CART_ITEMS).document(cart_item_id).get()
        if not doc.exists:
            return None
        item = doc.to_dict()
        cart_id, _ = _get_user_cart(user_id)
        if item.get("cart_id") != cart_id:
            return None
        return doc

    def patch(self, request, cart_item_id):
        quantity = request.data.get("quantity")
        if quantity is None or int(quantity) < 1:
            return Response(
                {"error": "quantity must be at least 1."}, status=status.HTTP_400_BAD_REQUEST
            )
        doc = self._get_item(cart_item_id, request.user.user_id)
        if doc is None:
            return Response({"error": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)
        doc.reference.update({"quantity": int(quantity)})
        return Response({"message": "Quantity updated.", "quantity": int(quantity)})

    def delete(self, request, cart_item_id):
        doc = self._get_item(cart_item_id, request.user.user_id)
        if doc is None:
            return Response({"error": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)
        doc.reference.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartClearView(APIView):
    """DELETE /api/v1/cart/clear/ – removes all items from cart."""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        cart_id, _ = _get_user_cart(request.user.user_id)
        if not cart_id:
            return Response({"error": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)
        items = (
            db.collection(Collections.CART_ITEMS)
            .where("cart_id", "==", cart_id)
            .get()
        )
        for item in items:
            item.reference.delete()
        return Response({"message": "Cart cleared."})
