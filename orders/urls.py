from django.urls import path
from .views import (
    CheckoutView,
    OrderListView,
    OrderDetailView,
    OrderStatusUpdateView,
    OrderCancelView,
)

urlpatterns = [
    path("",                                  OrderListView.as_view(),         name="order-list"),
    path("checkout/",                         CheckoutView.as_view(),          name="checkout"),
    path("<str:order_id>/",                   OrderDetailView.as_view(),       name="order-detail"),
    path("<str:order_id>/status/",            OrderStatusUpdateView.as_view(), name="order-status"),
    path("<str:order_id>/cancel/",            OrderCancelView.as_view(),       name="order-cancel"),
]
