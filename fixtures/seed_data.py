"""
fixtures/seed_data.py
──────────────────────
Seeds Firestore with sample categories, books, and an admin user.

Run with:
    python fixtures/seed_data.py

Make sure your DJANGO_SETTINGS_MODULE is set and firebase_credentials.json exists.
"""

import sys
import os
import uuid
import hashlib
from datetime import datetime, timezone

# ── Bootstrap Django settings ───────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "booknest.settings")

import django
django.setup()

from firebase_config.firebase import db, Collections


def hash_password(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def seed():
    now = datetime.now(timezone.utc).isoformat()

    # ── 1. Categories ──────────────────────────────────────────────────────
    categories = [
        {"category_name": "Fiction",              "description": "Stories from the imagination."},
        {"category_name": "Mystery & Thriller",   "description": "Keep you on the edge of your seat."},
        {"category_name": "Fantasy",              "description": "Magical worlds and epic quests."},
        {"category_name": "Science & Technology", "description": "Explore the frontiers of knowledge."},
        {"category_name": "Self-Help",            "description": "Tools to improve your life."},
        {"category_name": "History",              "description": "Learn from the past."},
        {"category_name": "Romance",              "description": "Stories of love and connection."},
        {"category_name": "Children's Books",     "description": "Stories for young readers."},
    ]

    category_ids = {}
    for cat in categories:
        cat_id = str(uuid.uuid4())
        cat["category_id"] = cat_id
        db.collection(Collections.CATEGORIES).document(cat_id).set(cat)
        category_ids[cat["category_name"]] = cat_id
        print(f"  ✔ Category: {cat['category_name']}")

    # ── 2. Products (Books) ────────────────────────────────────────────────
    books = [
        {
            "name":        "The Midnight Library",
            "author":      "Matt Haig",
            "description": "A novel about all the lives you could have lived.",
            "price":       399.0,
            "stock":       50,
            "category":    "Fiction",
        },
        {
            "name":        "Gone Girl",
            "author":      "Gillian Flynn",
            "description": "A twisty thriller about a marriage gone terribly wrong.",
            "price":       349.0,
            "stock":       30,
            "category":    "Mystery & Thriller",
        },
        {
            "name":        "The Name of the Wind",
            "author":      "Patrick Rothfuss",
            "description": "The legend of Kvothe, told in his own words.",
            "price":       499.0,
            "stock":       25,
            "category":    "Fantasy",
        },
        {
            "name":        "Sapiens",
            "author":      "Yuval Noah Harari",
            "description": "A brief history of humankind.",
            "price":       599.0,
            "stock":       40,
            "category":    "History",
        },
        {
            "name":        "Atomic Habits",
            "author":      "James Clear",
            "description": "Tiny changes, remarkable results.",
            "price":       449.0,
            "stock":       60,
            "category":    "Self-Help",
        },
        {
            "name":        "Clean Code",
            "author":      "Robert C. Martin",
            "description": "A handbook of agile software craftsmanship.",
            "price":       799.0,
            "stock":       20,
            "category":    "Science & Technology",
        },
        {
            "name":        "Pride and Prejudice",
            "author":      "Jane Austen",
            "description": "A romantic novel of manners.",
            "price":       199.0,
            "stock":       45,
            "category":    "Romance",
        },
        {
            "name":        "Harry Potter and the Philosopher's Stone",
            "author":      "J.K. Rowling",
            "description": "The boy who lived.",
            "price":       350.0,
            "stock":       55,
            "category":    "Children's Books",
        },
        {
            "name":        "The Da Vinci Code",
            "author":      "Dan Brown",
            "description": "A symbologist races to uncover a secret that could rock Christianity.",
            "price":       299.0,
            "stock":       35,
            "category":    "Mystery & Thriller",
        },
        {
            "name":        "Dune",
            "author":      "Frank Herbert",
            "description": "An epic science fiction novel set in a desert planet.",
            "price":       549.0,
            "stock":       18,
            "category":    "Fantasy",
        },
    ]

    for book in books:
        book_id = str(uuid.uuid4())
        db.collection(Collections.PRODUCTS).document(book_id).set({
            "product_id":  book_id,
            "category_id": category_ids[book["category"]],
            "name":        book["name"],
            "author":      book["author"],
            "description": book["description"],
            "price":       book["price"],
            "stock":       book["stock"],
            "image":       "",
            "created_at":  now,
        })
        print(f"  ✔ Book: {book['name']} by {book['author']}")

    # ── 3. Admin User ──────────────────────────────────────────────────────
    admin_id  = str(uuid.uuid4())
    cart_id   = str(uuid.uuid4())
    wl_id     = str(uuid.uuid4())

    db.collection(Collections.USERS).document(admin_id).set({
        "username":      "admin",
        "email":         "admin@booknest.com",
        "password":      hash_password("Admin@1234"),
        "phone":         "9999999999",
        "profile_image": "",
        "is_admin":      True,
        "created_at":    now,
    })
    db.collection(Collections.CARTS).document(cart_id).set(
        {"user_id": admin_id, "created_at": now}
    )
    db.collection(Collections.WISHLISTS).document(wl_id).set(
        {"user_id": admin_id}
    )
    print(f"\n  ✔ Admin user created")
    print(f"    Email:    admin@booknest.com")
    print(f"    Password: Admin@1234")
    print(f"    user_id:  {admin_id}")

    # ── 4. Sample Regular User ─────────────────────────────────────────────
    user_id       = str(uuid.uuid4())
    user_cart_id  = str(uuid.uuid4())
    user_wl_id    = str(uuid.uuid4())
    address_id    = str(uuid.uuid4())

    db.collection(Collections.USERS).document(user_id).set({
        "username":      "Priya Sharma",
        "email":         "priya@example.com",
        "password":      hash_password("Priya@1234"),
        "phone":         "9876543210",
        "profile_image": "",
        "is_admin":      False,
        "created_at":    now,
    })
    db.collection(Collections.CARTS).document(user_cart_id).set(
        {"user_id": user_id, "created_at": now}
    )
    db.collection(Collections.WISHLISTS).document(user_wl_id).set(
        {"user_id": user_id}
    )
    db.collection(Collections.ADDRESSES).document(address_id).set({
        "address_id": address_id,
        "user_id":    user_id,
        "full_name":  "Priya Sharma",
        "phone":      "9876543210",
        "house_no":   "42",
        "street":     "MG Road",
        "city":       "Bengaluru",
        "state":      "Karnataka",
        "pincode":    "560001",
        "country":    "India",
    })
    print(f"\n  ✔ Sample user created")
    print(f"    Email:    priya@example.com")
    print(f"    Password: Priya@1234")
    print(f"    user_id:  {user_id}")

    print("\n✅ Seed complete!\n")


if __name__ == "__main__":
    print("\n🌱 Seeding Firestore …\n")
    seed()
