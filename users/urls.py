from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    ProfileView,
    ProfileImageUploadView,
    ChangePasswordView,
    AddressListCreateView,
    AddressDetailView,
)

urlpatterns = [
    path("register/",          RegisterView.as_view(),           name="register"),
    path("login/",             LoginView.as_view(),               name="login"),
    path("logout/",            LogoutView.as_view(),              name="logout"),
    path("profile/",           ProfileView.as_view(),             name="profile"),
    path("profile/image/",     ProfileImageUploadView.as_view(),  name="profile-image"),
    path("change-password/",   ChangePasswordView.as_view(),      name="change-password"),
    path("addresses/",         AddressListCreateView.as_view(),   name="address-list"),
    path("addresses/<str:address_id>/", AddressDetailView.as_view(), name="address-detail"),
]
