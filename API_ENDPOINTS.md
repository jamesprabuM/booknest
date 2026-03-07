# BOOKNEST API – Endpoint Reference

Base URL: `http://localhost:8000/api/v1`

All protected routes require:
```
Authorization: Bearer <access_token>
```

---

## 🔐 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register/` | Public | Register a new user |
| POST | `/auth/login/` | Public | Login and receive JWT tokens |
| POST | `/auth/logout/` | 🔒 User | Blacklist refresh token (logout) |
| POST | `/auth/token/refresh/` | Public | Get new access token using refresh token |

### Register
```
POST /auth/register/
{
  "username": "Priya Sharma",
  "email": "priya@example.com",
  "password": "Priya@1234",
  "phone": "9876543210"       ← optional
}
Response 201: { "message": "Account created successfully.", "user_id": "..." }
```

### Login
```
POST /auth/login/
{ "email": "priya@example.com", "password": "Priya@1234" }
Response 200: { "access": "...", "refresh": "...", "user": { ... } }
```

### Logout
```
POST /auth/logout/
{ "refresh": "<refresh_token>" }
Response 200: { "message": "Logged out successfully." }
```

### Token Refresh
```
POST /auth/token/refresh/
{ "refresh": "<refresh_token>" }
Response 200: { "access": "<new_access_token>" }
```

---

## 👤 User Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/auth/profile/` | 🔒 User | Get own profile |
| PATCH | `/auth/profile/` | 🔒 User | Update username / phone |
| POST | `/auth/profile/image/` | 🔒 User | Upload profile photo (multipart) |
| POST | `/auth/change-password/` | 🔒 User | Change password |

### Change Password
```
POST /auth/change-password/
{ "old_password": "...", "new_password": "..." }
```

---

## 📍 Addresses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/auth/addresses/` | 🔒 User | List all saved addresses |
| POST | `/auth/addresses/` | 🔒 User | Add new address |
| GET | `/auth/addresses/<address_id>/` | 🔒 User | Get single address |
| PATCH | `/auth/addresses/<address_id>/` | 🔒 User | Update address |
| DELETE | `/auth/addresses/<address_id>/` | 🔒 User | Delete address |

### Add Address
```
POST /auth/addresses/
{
  "full_name": "Priya Sharma",
  "phone": "9876543210",
  "house_no": "42",
  "street": "MG Road",
  "city": "Bengaluru",
  "state": "Karnataka",
  "pincode": "560001",
  "country": "India"
}
```

---

## 📚 Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories/` | Public | List all categories |
| POST | `/categories/` | 🔒 Admin | Create category |
| GET | `/categories/<category_id>/` | Public | Get category details |
| PATCH | `/categories/<category_id>/` | 🔒 Admin | Update category |
| DELETE | `/categories/<category_id>/` | 🔒 Admin | Delete category |

---

## 📖 Products (Books)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products/` | Public | List all books (supports filtering + search) |
| POST | `/products/` | 🔒 Admin | Add a new book |
| GET | `/products/<product_id>/` | Public | Get book details |
| PATCH | `/products/<product_id>/` | 🔒 Admin | Update book details |
| DELETE | `/products/<product_id>/` | 🔒 Admin | Delete book |
| POST | `/products/<product_id>/image/` | 🔒 Admin | Upload book cover (multipart) |

### Query Parameters
```
GET /products/?category=<category_id>     ← filter by genre
GET /products/?search=harry               ← search by name or author
GET /products/?category=<id>&search=dune  ← combined
```

### Add Book (Admin)
```
POST /products/
{
  "category_id": "...",
  "name": "The Alchemist",
  "author": "Paulo Coelho",
  "description": "A story about following your dreams.",
  "price": 299.00,
  "stock": 50
}
```

---

## 🛒 Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart/` | 🔒 User | View cart with items + total |
| POST | `/cart/items/` | 🔒 User | Add item to cart |
| PATCH | `/cart/items/<cart_item_id>/` | 🔒 User | Update item quantity |
| DELETE | `/cart/items/<cart_item_id>/` | 🔒 User | Remove item from cart |
| DELETE | `/cart/clear/` | 🔒 User | Empty entire cart |

### Add to Cart
```
POST /cart/items/
{ "product_id": "...", "quantity": 2 }
```

### Update Quantity
```
PATCH /cart/items/<cart_item_id>/
{ "quantity": 3 }
```

### Cart Response Structure
```json
{
  "cart_id": "...",
  "items": [
    {
      "cart_item_id": "...",
      "product_id": "...",
      "quantity": 2,
      "product": { "name": "...", "author": "...", "price": 399.0, "image": "..." }
    }
  ],
  "total": 798.0,
  "item_count": 1
}
```

---

## 💖 Wishlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/wishlist/` | 🔒 User | View wishlist |
| POST | `/wishlist/items/` | 🔒 User | Add book to wishlist |
| DELETE | `/wishlist/items/<wishlist_item_id>/` | 🔒 User | Remove from wishlist |
| POST | `/wishlist/items/<wishlist_item_id>/move-to-cart/` | 🔒 User | Move to cart |

### Add to Wishlist
```
POST /wishlist/items/
{ "product_id": "..." }
```

---

## 📦 Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders/checkout/` | 🔒 User | Place order from cart |
| GET | `/orders/` | 🔒 User/Admin | List orders (users see own; admin sees all) |
| GET | `/orders/<order_id>/` | 🔒 User/Admin | Order detail with items |
| PATCH | `/orders/<order_id>/status/` | 🔒 Admin | Update order status |
| POST | `/orders/<order_id>/cancel/` | 🔒 User/Admin | Cancel order |

### Checkout
```
POST /orders/checkout/
{
  "address_id": "...",
  "payment_mode": "Razorpay"
}
Response 201: { "order_id": "...", "total_amount": 798.0, "message": "..." }
```

### Order Statuses
`Pending` → `Paid` → `Shipped` → `Delivered`
(or `Cancelled` from Pending/Paid)

### Update Status (Admin)
```
PATCH /orders/<order_id>/status/
{ "order_status": "Shipped" }
```

---

## 💳 Payments (Razorpay)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/create/` | 🔒 User | Create Razorpay order |
| POST | `/payments/verify/` | 🔒 User | Verify payment signature |
| GET | `/payments/<order_id>/` | 🔒 User | Get payment details for an order |

### Create Payment
```
POST /payments/create/
{ "order_id": "..." }
Response: {
  "razorpay_order_id": "order_xxx",
  "razorpay_key_id": "rzp_test_xxx",
  "amount": 79800,    ← paise
  "currency": "INR",
  "order_id": "..."
}
```

### Verify Payment (call after Razorpay popup success)
```
POST /payments/verify/
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "...",
  "order_id": "..."
}
Response: { "message": "Payment successful.", "payment_id": "..." }
```

---

## 🔑 Role Summary

| Role | Capabilities |
|------|-------------|
| **Public** | Browse books, view categories |
| **User** | + Register/Login, Cart, Wishlist, Checkout, Orders, Profile |
| **Admin** | + All of the above + Manage books/categories, Update order status, View all orders |

Admin accounts are created by setting `is_admin: true` in Firestore or running the seed script.
