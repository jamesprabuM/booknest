from django.urls import path
from .views import WishlistView, WishlistItemAddView, WishlistItemRemoveView, WishlistMoveToCartView

urlpatterns = [
    path("",                                          WishlistView.as_view(),           name="wishlist"),
    path("items/",                                    WishlistItemAddView.as_view(),    name="wishlist-add"),
    path("items/<str:wishlist_item_id>/",             WishlistItemRemoveView.as_view(), name="wishlist-remove"),
    path("items/<str:wishlist_item_id>/move-to-cart/",WishlistMoveToCartView.as_view(),name="wishlist-move"),
]
