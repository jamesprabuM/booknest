# 📕 BOOKNEST – Online Bookstore API

Django + DRF backend with **Firestore** as the database, **JWT** authentication, and **Razorpay** payments.

---

## 🗂 Project Structure

```
booknest/
├── manage.py
├── requirements.txt
├── .env.example                  ← copy to .env and fill in values
├── API_ENDPOINTS.md              ← full API reference
├── fixtures/
│   └── seed_data.py              ← seed Firestore with sample books & users
├── booknest/                     ← Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── firebase_config/              ← Firebase Admin SDK initialisation
│   └── firebase.py
├── authentication/               ← Custom JWT + Firestore auth backend
│   └── backends.py
├── users/                        ← Register, Login, Profile, Addresses
├── products/                     ← Categories & Books (CRUD + image upload)
├── cart/                         ← Cart & CartItems
├── wishlist/                     ← Wishlist & WishlistItems
├── orders/                       ← Checkout, Order History, Status Updates
└── payments/                     ← Razorpay Create + Verify
```

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd booknest
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → Create Project → **BOOKNEST**
2. Enable **Firestore** (Native mode)
3. Enable **Firebase Storage**
4. Go to **Project Settings → Service Accounts → Generate new private key**
5. Save the downloaded JSON as `firebase_credentials.json` in the project root

> **Project ID:** `booknest-f2a44`  
> **Service Account:** `firebase-adminsdk-fbsvc@booknest-f2a44.iam.gserviceaccount.com`

⚠️ **Never commit `firebase_credentials.json` to version control.** It is already listed in `.gitignore`.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
SECRET_KEY=your-long-random-secret-key
DEBUG=True
FIREBASE_CREDENTIALS_PATH=firebase_credentials.json
FIREBASE_STORAGE_BUCKET=booknest-f2a44.appspot.com
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

> 💡 Get Razorpay test keys at [dashboard.razorpay.com](https://dashboard.razorpay.com)

### 4. Run Migrations (only for JWT blacklist table)

```bash
python manage.py migrate
```

### 5. Seed Sample Data

```bash
python fixtures/seed_data.py
```

This creates:
- 8 book categories (Fiction, Mystery, Fantasy …)
- 10 sample books with real prices
- 1 admin user: `admin@booknest.com` / `Admin@1234`
- 1 regular user: `priya@example.com` / `Priya@1234`

### 6. Run the Server

```bash
python manage.py runserver
```

API is live at: `http://localhost:8000/api/v1/`

---

## 🔒 Authentication Flow

```
1. POST /api/v1/auth/register/   → create account
2. POST /api/v1/auth/login/      → get access + refresh tokens
3. Use "Authorization: Bearer <access>" header on protected routes
4. POST /api/v1/auth/token/refresh/ → refresh expired access token
5. POST /api/v1/auth/logout/     → blacklist refresh token
```

---

## 🛒 Checkout Flow

```
1. Add books to cart:  POST /api/v1/cart/items/
2. Checkout:           POST /api/v1/orders/checkout/  → returns order_id
3. Create payment:     POST /api/v1/payments/create/  → returns razorpay_order_id
4. Open Razorpay popup (frontend)
5. On success:         POST /api/v1/payments/verify/  → confirms payment
6. Track order:        GET  /api/v1/orders/<order_id>/
```

---

## 🏗️ Firestore Collections

| Collection | Description |
|------------|-------------|
| `users` | Registered customers |
| `addresses` | Delivery addresses (linked to users) |
| `categories` | Book genres |
| `products` | Books for sale |
| `carts` | One cart per user |
| `cart_items` | Books inside a cart |
| `wishlists` | One wishlist per user |
| `wishlist_items` | Books saved for later |
| `orders` | Placed orders |
| `order_items` | Books inside each order |
| `payments` | Razorpay payment records |

---

## 👑 Admin Capabilities

Admins have `is_admin: true` in Firestore. They can:
- Create / Edit / Delete categories and books
- Upload book cover images
- View all orders across all users
- Update order statuses (Pending → Shipped → Delivered)
- Cancel orders

---

## 🌐 CORS & Frontend

Set `CORS_ALLOWED_ORIGINS` in `.env` to your frontend URL:
```
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

---

## 📦 Deployment (Render/Railway)

1. Push project to GitHub
2. Set all environment variables in the platform's dashboard
3. Set start command: `gunicorn booknest.wsgi:application`
4. Add `gunicorn` to `requirements.txt`

---

## 🔐 Security Notes

- Passwords are SHA-256 hashed. **Use bcrypt in production** (`pip install bcrypt`)
- Always set `DEBUG=False` in production
- Use environment secrets, never commit `.env` or `firebase_credentials.json`
- Add Firestore security rules to restrict direct client access
