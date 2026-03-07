"""
wishlist/views.py
──────────────────
Wishlist is auto-created on registration (one per user).
Users can add / remove books from their wishlist.
"""

import uuid
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from firebase_config.firebase import db, Collections


def _get_user_wishlist(user_id: str):
    docs = (
        db.collection(Collections.WISHLISTS)
        .where("user_id", "==", user_id)
        .limit(1)
        .get()
    )
    if not docs:
        return None, None
    doc = docs[0]
    return doc.id, doc.to_dict()


class WishlistView(APIView):
    """GET /api/v1/wishlist/ – list all wishlist items with product details."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wishlist_id, _ = _get_user_wishlist(request.user.user_id)
        if not wishlist_id:
            return Response({"error": "Wishlist not found."}, status=status.HTTP_404_NOT_FOUND)

        docs = (
            db.collection(Collections.WISHLIST_ITEMS)
            .where("wishlist_id", "==", wishlist_id)
            .get()
        )
        items = []
        for d in docs:
            item = {**d.to_dict(), "wishlist_item_id": d.id}
            prod_doc = db.collection(Collections.PRODUCTS).document(item["product_id"]).get()
            if prod_doc.exists:
                prod = prod_doc.to_dict()
                item["product"] = {
                    "name":   prod.get("name"),
                    "author": prod.get("author"),
                    "price":  prod.get("price"),
                    "image":  prod.get("image"),
                }
            items.append(item)

        return Response({"wishlist_id": wishlist_id, "items": items})


class WishlistItemAddView(APIView):
    """
    POST /api/v1/wishlist/items/
    Body: { "product_id": "..." }
    Silently succeeds if already in wishlist.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"error": "product_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify product exists
        if not db.collection(Collections.PRODUCTS).document(product_id).get().exists:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        wishlist_id, _ = _get_user_wishlist(request.user.user_id)
        if not wishlist_id:
            return Response({"error": "Wishlist not found."}, status=status.HTTP_404_NOT_FOUND)

        # Avoid duplicates
        existing = (
            db.collection(Collections.WISHLIST_ITEMS)
            .where("wishlist_id", "==", wishlist_id)
            .where("product_id", "==", product_id)
            .limit(1)
            .get()
        )
        if existing:
            return Response({"message": "Already in wishlist."})

        item_id = str(uuid.uuid4())
        db.collection(Collections.WISHLIST_ITEMS).document(item_id).set({
            "wishlist_item_id": item_id,
            "wishlist_id":      wishlist_id,
            "product_id":       product_id,
        })
        return Response({"message": "Added to wishlist.", "wishlist_item_id": item_id},
                        status=status.HTTP_201_CREATED)


class WishlistItemRemoveView(APIView):
    """DELETE /api/v1/wishlist/items/<wishlist_item_id>/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, wishlist_item_id):
        wishlist_id, _ = _get_user_wishlist(request.user.user_id)
        doc = db.collection(Collections.WISHLIST_ITEMS).document(wishlist_item_id).get()
        if not doc.exists or doc.to_dict().get("wishlist_id") != wishlist_id:
            return Response({"error": "Item not found."}, status=status.HTTP_404_NOT_FOUND)
        doc.reference.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WishlistMoveToCartView(APIView):
    """
    POST /api/v1/wishlist/items/<wishlist_item_id>/move-to-cart/
    Moves a single wishlist item into the user's cart.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, wishlist_item_id):
        wishlist_id, _ = _get_user_wishlist(request.user.user_id)
        wi_doc = db.collection(Collections.WISHLIST_ITEMS).document(wishlist_item_id).get()
        if not wi_doc.exists or wi_doc.to_dict().get("wishlist_id") != wishlist_id:
            return Response({"error": "Item not found."}, status=status.HTTP_404_NOT_FOUND)

        product_id = wi_doc.to_dict()["product_id"]

        # Add to cart
        cart_docs = (
            db.collection(Collections.CARTS)
            .where("user_id", "==", request.user.user_id)
            .limit(1)
            .get()
        )
        if not cart_docs:
            return Response({"error": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)
        cart_id = cart_docs[0].id

        existing_cart_item = (
            db.collection(Collections.CART_ITEMS)
            .where("cart_id", "==", cart_id)
            .where("product_id", "==", product_id)
            .limit(1)
            .get()
        )
        if existing_cart_item:
            existing_cart_item[0].reference.update(
                {"quantity": existing_cart_item[0].to_dict()["quantity"] + 1}
            )
        else:
            new_item_id = str(uuid.uuid4())
            db.collection(Collections.CART_ITEMS).document(new_item_id).set({
                "cart_item_id": new_item_id,
                "cart_id":      cart_id,
                "product_id":   product_id,
                "quantity":     1,
            })

        # Remove from wishlist
        wi_doc.reference.delete()
        return Response({"message": "Moved to cart."})
