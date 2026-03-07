"""
products/serializers.py
────────────────────────
Serializers for Category and Product (Book).
"""

import uuid
from rest_framework import serializers
from firebase_config.firebase import db, Collections


class CategorySerializer(serializers.Serializer):
    category_id   = serializers.CharField(read_only=True)
    category_name = serializers.CharField(max_length=100)
    description   = serializers.CharField(required=False, allow_blank=True, default="")

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
    name        = serializers.CharField(max_length=255)
    author      = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    price       = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock       = serializers.IntegerField(min_value=0)
    image       = serializers.CharField(read_only=True)   # updated via separate upload
    created_at  = serializers.CharField(read_only=True)

    def validate_category_id(self, value):
        doc = db.collection(Collections.CATEGORIES).document(value).get()
        if not doc.exists:
            raise serializers.ValidationError("Category not found.")
        return value

    def create(self, validated_data):
        from datetime import datetime, timezone
        product_id = str(uuid.uuid4())
        validated_data.update({
            "product_id": product_id,
            "image":      "",
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
