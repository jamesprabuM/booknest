"""
products/serializers.py
────────────────────────
Serializers for Category and Product (Book).
"""

import uuid
from decimal import Decimal
from rest_framework import serializers
from firebase_config.firebase import db, Collections


def _collapse_spaces(value: str) -> str:
    return " ".join(value.split())


class CategorySerializer(serializers.Serializer):
    category_id   = serializers.CharField(read_only=True)
    category_name = serializers.CharField(max_length=100, min_length=2)
    description   = serializers.CharField(required=False, allow_blank=True, default="", max_length=500)

    def validate_category_name(self, value):
        cleaned = _collapse_spaces(value)
        if len(cleaned) < 2:
            raise serializers.ValidationError("Category name must be at least 2 characters.")

        current_category_id = self.context.get("category_id")
        existing = (
            db.collection(Collections.CATEGORIES)
            .where("category_name", "==", cleaned)
            .limit(1)
            .get()
        )
        if existing and existing[0].id != current_category_id:
            raise serializers.ValidationError("Category name already exists.")
        return cleaned

    def validate_description(self, value):
        return value.strip()

    def create(self, validated_data):
        cat_id = str(uuid.uuid4())
        validated_data["category_id"] = cat_id
        db.collection(Collections.CATEGORIES).document(cat_id).set(validated_data)
        return validated_data

    def update(self, category_id, validated_data):
        db.collection(Collections.CATEGORIES).document(category_id).update(validated_data)
        validated_data["category_id"] = category_id
        return validated_data


class ProductSerializer(serializers.Serializer):
    product_id  = serializers.CharField(read_only=True)
    category_id = serializers.CharField()
    name        = serializers.CharField(max_length=255, min_length=2)
    author      = serializers.CharField(max_length=200, min_length=2)
    description = serializers.CharField(required=False, allow_blank=True, default="", max_length=2000)
    price       = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    stock       = serializers.IntegerField(min_value=0, max_value=100000)
    image       = serializers.URLField(required=False, allow_blank=True, default="")
    created_at  = serializers.CharField(read_only=True)

    def validate_category_id(self, value):
        doc = db.collection(Collections.CATEGORIES).document(value).get()
        if not doc.exists:
            raise serializers.ValidationError("Category not found.")
        return value

    def validate_name(self, value):
        cleaned = _collapse_spaces(value)
        if len(cleaned) < 2:
            raise serializers.ValidationError("Book name must be at least 2 characters.")
        return cleaned

    def validate_author(self, value):
        cleaned = _collapse_spaces(value)
        if len(cleaned) < 2:
            raise serializers.ValidationError("Author name must be at least 2 characters.")
        return cleaned

    def validate_description(self, value):
        return value.strip()

    def validate_image(self, value):
        cleaned = value.strip()
        if cleaned and not (cleaned.startswith("http://") or cleaned.startswith("https://")):
            raise serializers.ValidationError("Image URL must start with http:// or https://")
        return cleaned

    def validate(self, attrs):
        existing_product = self.context.get("existing_product", {})
        current_product_id = self.context.get("product_id")

        name = attrs.get("name", existing_product.get("name", ""))
        author = attrs.get("author", existing_product.get("author", ""))

        if not name or not author:
            return attrs

        normalized_name = _collapse_spaces(name).lower()
        normalized_author = _collapse_spaces(author).lower()

        # Query by name then compare normalized author in-memory to avoid broad scans.
        candidate_docs = (
            db.collection(Collections.PRODUCTS)
            .where("name", "==", name)
            .get()
        )

        for doc in candidate_docs:
            if current_product_id and doc.id == current_product_id:
                continue
            data = doc.to_dict() or {}
            if _collapse_spaces(data.get("author", "")).lower() == normalized_author and _collapse_spaces(data.get("name", "")).lower() == normalized_name:
                raise serializers.ValidationError("A book with the same name and author already exists.")

        return attrs

    def create(self, validated_data):
        from datetime import datetime, timezone
        product_id = str(uuid.uuid4())
        image_url = validated_data.get("image", "")
        validated_data.update({
            "product_id": product_id,
            "image":      image_url,
            "price":      float(validated_data["price"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        db.collection(Collections.PRODUCTS).document(product_id).set(validated_data)
        return validated_data

    def update(self, product_id, validated_data):
        if "price" in validated_data:
            validated_data["price"] = float(validated_data["price"])
        db.collection(Collections.PRODUCTS).document(product_id).update(validated_data)
        validated_data["product_id"] = product_id
        return validated_data
