from django.urls import path
from .views import CreatePaymentView, VerifyPaymentView, PaymentDetailView

urlpatterns = [
    path("create/",              CreatePaymentView.as_view(),  name="payment-create"),
    path("verify/",              VerifyPaymentView.as_view(),  name="payment-verify"),
    path("<str:order_id>/",      PaymentDetailView.as_view(),  name="payment-detail"),
]
