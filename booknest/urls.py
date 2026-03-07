"""
BOOKNEST – Root URL Configuration
All API routes are versioned under /api/v1/
"""

from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # ── Auth (register / login / logout / token refresh) ──────────────────
    path("api/v1/auth/", include("users.urls")),

    # ── JWT token refresh (standard SimpleJWT endpoint) ───────────────────
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ── Products & Categories ──────────────────────────────────────────────
    path("api/v1/", include("products.urls")),

    # ── Cart ──────────────────────────────────────────────────────────────
    path("api/v1/cart/", include("cart.urls")),

    # ── Wishlist ──────────────────────────────────────────────────────────
    path("api/v1/wishlist/", include("wishlist.urls")),

    # ── Orders ────────────────────────────────────────────────────────────
    path("api/v1/orders/", include("orders.urls")),

    # ── Payments ──────────────────────────────────────────────────────────
    path("api/v1/payments/", include("payments.urls")),
]
