from django.urls import path
from .views import (
    CategoryListCreateView,
    CategoryDetailView,
    ProductListCreateView,
    ProductDetailView,
    ProductImageUploadView,
)

urlpatterns = [
    # Categories
    path("categories/",                      CategoryListCreateView.as_view(), name="category-list"),
    path("categories/<str:category_id>/",    CategoryDetailView.as_view(),     name="category-detail"),

    # Products (Books)
    path("products/",                        ProductListCreateView.as_view(),  name="product-list"),
    path("products/<str:product_id>/",       ProductDetailView.as_view(),      name="product-detail"),
    path("products/<str:product_id>/image/", ProductImageUploadView.as_view(), name="product-image"),
]
