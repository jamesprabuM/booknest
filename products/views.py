"""
products/views.py
──────────────────
Category CRUD (admin only) and Product CRUD + search/filter.
Book cover images are uploaded to Firebase Storage.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from firebase_config.firebase import db, bucket, Collections
from .serializers import CategorySerializer, ProductSerializer


# ── Permission helper ──────────────────────────────────────────────────────

def is_admin(request):
    return getattr(request.user, "is_admin", False)


# ══════════════════════════════════════════════════════════════════════════
# CATEGORIES
# ══════════════════════════════════════════════════════════════════════════

class CategoryListCreateView(APIView):
    """
    GET  /api/v1/categories/        – public; list all categories
    POST /api/v1/categories/        – admin only; create a category
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        docs = db.collection(Collections.CATEGORIES).get()
        categories = [{**d.to_dict(), "category_id": d.id} for d in docs]
        response = Response(categories)
        response["Cache-Control"] = "public, max-age=300"
        return response

    def post(self, request):
        if not is_admin(request):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CategorySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        category = serializer.create(serializer.validated_data)
        return Response(category, status=status.HTTP_201_CREATED)


class CategoryDetailView(APIView):
    """
    GET    /api/v1/categories/<category_id>/  – public
    PATCH  /api/v1/categories/<category_id>/  – admin
    DELETE /api/v1/categories/<category_id>/  – admin
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def _get_category(self, category_id):
        doc = db.collection(Collections.CATEGORIES).document(category_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["category_id"] = category_id
        return data

    def get(self, request, category_id):
        category = self._get_category(category_id)
        if category is None:
            return Response({"error": "Category not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(category)

    def patch(self, request, category_id):
        if not is_admin(request):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        category = self._get_category(category_id)
        if category is None:
            return Response({"error": "Category not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = CategorySerializer(data=request.data, partial=True, context={"category_id": category_id})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.update(category_id, serializer.validated_data)
        return Response(updated)

    def delete(self, request, category_id):
        if not is_admin(request):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        category = self._get_category(category_id)
        if category is None:
            return Response({"error": "Category not found."}, status=status.HTTP_404_NOT_FOUND)
        db.collection(Collections.CATEGORIES).document(category_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ══════════════════════════════════════════════════════════════════════════
# PRODUCTS (Books)
# ══════════════════════════════════════════════════════════════════════════

class ProductListCreateView(APIView):
    """
    GET  /api/v1/products/    – public; supports ?category=<id> and ?search=<term>
    POST /api/v1/products/    – admin only
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        query = db.collection(Collections.PRODUCTS)

        # ── Filter by category ────────────────────────────────────────────
        category_id = request.query_params.get("category")
        if category_id:
            query = query.where("category_id", "==", category_id)

        docs = query.get()
        products = [{**d.to_dict(), "product_id": d.id} for d in docs]

        # ── Search by name or author (client-side filter) ─────────────────
        search = request.query_params.get("search", "").lower()
        if search:
            products = [
                p for p in products
                if search in p.get("name", "").lower()
                or search in p.get("author", "").lower()
            ]

        response = Response(products)
        response["Cache-Control"] = "public, max-age=60"
        return response

    def post(self, request):
        if not is_admin(request):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ProductSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        product = serializer.create(serializer.validated_data)
        return Response(product, status=status.HTTP_201_CREATED)


class ProductDetailView(APIView):
    """
    GET    /api/v1/products/<product_id>/  – public
    PATCH  /api/v1/products/<product_id>/  – admin
    DELETE /api/v1/products/<product_id>/  – admin
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def _get_product(self, product_id):
        doc = db.collection(Collections.PRODUCTS).document(product_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["product_id"] = product_id
        return data

    def get(self, request, product_id):
        product = self._get_product(product_id)
        if product is None:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(product)

    def patch(self, request, product_id):
        if not is_admin(request):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        product = self._get_product(product_id)
        if product is None:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProductSerializer(
            data=request.data,
            partial=True,
            context={"product_id": product_id, "existing_product": product},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.update(product_id, serializer.validated_data)
        return Response(updated)

    def delete(self, request, product_id):
        if not is_admin(request):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        product = self._get_product(product_id)
        if product is None:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        db.collection(Collections.PRODUCTS).document(product_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductImageUploadView(APIView):
    """
    POST /api/v1/products/<product_id>/image/  – admin only
    Uploads a book cover image to Firebase Storage.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        if not is_admin(request):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)

        ext       = image_file.name.rsplit(".", 1)[-1]
        blob_name = f"book_covers/{product_id}.{ext}"
        blob      = bucket.blob(blob_name)
        blob.upload_from_file(image_file, content_type=image_file.content_type)
        blob.make_public()

        image_url = blob.public_url
        db.collection(Collections.PRODUCTS).document(product_id).update({"image": image_url})
        return Response({"image": image_url})
