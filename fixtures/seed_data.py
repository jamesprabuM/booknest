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
        # ── Fiction ────────────────────────────────────────────────────────
        {
            "name":        "The Midnight Library",
            "author":      "Matt Haig",
            "description": "A novel about all the lives you could have lived.",
            "price":       399.0,
            "stock":       50,
            "category":    "Fiction",
            "image":       "https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg",
        },
        {
            "name":        "The Great Gatsby",
            "author":      "F. Scott Fitzgerald",
            "description": "A portrait of the Jazz Age and the American dream.",
            "price":       249.0,
            "stock":       60,
            "category":    "Fiction",
            "image":       "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
        },
        {
            "name":        "To Kill a Mockingbird",
            "author":      "Harper Lee",
            "description": "A gripping tale of racial injustice in the Deep South.",
            "price":       299.0,
            "stock":       40,
            "category":    "Fiction",
            "image":       "https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg",
        },
        {
            "name":        "1984",
            "author":      "George Orwell",
            "description": "A dystopian novel about totalitarianism and surveillance.",
            "price":       199.0,
            "stock":       70,
            "category":    "Fiction",
            "image":       "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg",
        },
        # ── Mystery & Thriller ─────────────────────────────────────────────
        {
            "name":        "Gone Girl",
            "author":      "Gillian Flynn",
            "description": "A twisty thriller about a marriage gone terribly wrong.",
            "price":       349.0,
            "stock":       30,
            "category":    "Mystery & Thriller",
            "image":       "https://covers.openlibrary.org/b/isbn/9780307588371-L.jpg",
        },
        {
            "name":        "The Da Vinci Code",
            "author":      "Dan Brown",
            "description": "A symbologist races to uncover a secret that could rock Christianity.",
            "price":       299.0,
            "stock":       35,
            "category":    "Mystery & Thriller",
            "image":       "https://covers.openlibrary.org/b/isbn/9780307474278-L.jpg",
        },
        {
            "name":        "The Girl with the Dragon Tattoo",
            "author":      "Stieg Larsson",
            "description": "A journalist and hacker investigate a decades-old disappearance.",
            "price":       379.0,
            "stock":       25,
            "category":    "Mystery & Thriller",
            "image":       "https://covers.openlibrary.org/b/isbn/9780307454546-L.jpg",
        },
        {
            "name":        "Sherlock Holmes: Complete Collection",
            "author":      "Arthur Conan Doyle",
            "description": "All the adventures of the world's greatest detective.",
            "price":       499.0,
            "stock":       20,
            "category":    "Mystery & Thriller",
            "image":       "https://covers.openlibrary.org/b/isbn/9780553212419-L.jpg",
        },
        # ── Fantasy ────────────────────────────────────────────────────────
        {
            "name":        "The Name of the Wind",
            "author":      "Patrick Rothfuss",
            "description": "The legend of Kvothe, told in his own words.",
            "price":       499.0,
            "stock":       25,
            "category":    "Fantasy",
            "image":       "https://covers.openlibrary.org/b/isbn/9780756404741-L.jpg",
        },
        {
            "name":        "Dune",
            "author":      "Frank Herbert",
            "description": "An epic science fiction novel set in a desert planet.",
            "price":       549.0,
            "stock":       18,
            "category":    "Fantasy",
            "image":       "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg",
        },
        {
            "name":        "The Hobbit",
            "author":      "J.R.R. Tolkien",
            "description": "Bilbo Baggins embarks on an unexpected journey.",
            "price":       349.0,
            "stock":       45,
            "category":    "Fantasy",
            "image":       "https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg",
        },
        {
            "name":        "A Game of Thrones",
            "author":      "George R.R. Martin",
            "description": "Noble families fight for the Iron Throne in Westeros.",
            "price":       449.0,
            "stock":       30,
            "category":    "Fantasy",
            "image":       "https://covers.openlibrary.org/b/isbn/9780553593716-L.jpg",
        },
        # ── Science & Technology ───────────────────────────────────────────
        {
            "name":        "Clean Code",
            "author":      "Robert C. Martin",
            "description": "A handbook of agile software craftsmanship.",
            "price":       799.0,
            "stock":       20,
            "category":    "Science & Technology",
            "image":       "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
        },
        {
            "name":        "The Pragmatic Programmer",
            "author":      "David Thomas & Andrew Hunt",
            "description": "Your journey to mastery in software development.",
            "price":       699.0,
            "stock":       15,
            "category":    "Science & Technology",
            "image":       "https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg",
        },
        {
            "name":        "A Brief History of Time",
            "author":      "Stephen Hawking",
            "description": "An exploration of the universe from the Big Bang to black holes.",
            "price":       399.0,
            "stock":       35,
            "category":    "Science & Technology",
            "image":       "https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg",
        },
        # ── Self-Help ──────────────────────────────────────────────────────
        {
            "name":        "Atomic Habits",
            "author":      "James Clear",
            "description": "Tiny changes, remarkable results.",
            "price":       449.0,
            "stock":       60,
            "category":    "Self-Help",
            "image":       "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
        },
        {
            "name":        "The Psychology of Money",
            "author":      "Morgan Housel",
            "description": "Timeless lessons on wealth, greed, and happiness.",
            "price":       349.0,
            "stock":       55,
            "category":    "Self-Help",
            "image":       "https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg",
        },
        {
            "name":        "Think and Grow Rich",
            "author":      "Napoleon Hill",
            "description": "The classic guide to achieving success and wealth.",
            "price":       199.0,
            "stock":       50,
            "category":    "Self-Help",
            "image":       "https://covers.openlibrary.org/b/isbn/9781585424337-L.jpg",
        },
        {
            "name":        "The Power of Now",
            "author":      "Eckhart Tolle",
            "description": "A guide to spiritual enlightenment and living in the present.",
            "price":       329.0,
            "stock":       40,
            "category":    "Self-Help",
            "image":       "https://covers.openlibrary.org/b/isbn/9781577314806-L.jpg",
        },
        # ── History ────────────────────────────────────────────────────────
        {
            "name":        "Sapiens",
            "author":      "Yuval Noah Harari",
            "description": "A brief history of humankind.",
            "price":       599.0,
            "stock":       40,
            "category":    "History",
            "image":       "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
        },
        {
            "name":        "The Diary of a Young Girl",
            "author":      "Anne Frank",
            "description": "A young girl's diary during the Holocaust.",
            "price":       199.0,
            "stock":       50,
            "category":    "History",
            "image":       "https://covers.openlibrary.org/b/isbn/9780553296983-L.jpg",
        },
        {
            "name":        "Guns, Germs, and Steel",
            "author":      "Jared Diamond",
            "description": "The fates of human societies across 13,000 years.",
            "price":       499.0,
            "stock":       25,
            "category":    "History",
            "image":       "https://covers.openlibrary.org/b/isbn/9780393317558-L.jpg",
        },
        # ── Romance ────────────────────────────────────────────────────────
        {
            "name":        "Pride and Prejudice",
            "author":      "Jane Austen",
            "description": "A romantic novel of manners.",
            "price":       199.0,
            "stock":       45,
            "category":    "Romance",
            "image":       "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
        },
        {
            "name":        "The Notebook",
            "author":      "Nicholas Sparks",
            "description": "A love story that spans decades.",
            "price":       279.0,
            "stock":       35,
            "category":    "Romance",
            "image":       "https://covers.openlibrary.org/b/isbn/9780446605236-L.jpg",
        },
        {
            "name":        "Me Before You",
            "author":      "Jojo Moyes",
            "description": "A heartbreaking love story about two people from different worlds.",
            "price":       329.0,
            "stock":       30,
            "category":    "Romance",
            "image":       "https://covers.openlibrary.org/b/isbn/9780143124542-L.jpg",
        },
        # ── Children's Books ───────────────────────────────────────────────
        {
            "name":        "Harry Potter and the Philosopher's Stone",
            "author":      "J.K. Rowling",
            "description": "The boy who lived.",
            "price":       350.0,
            "stock":       55,
            "category":    "Children's Books",
            "image":       "https://covers.openlibrary.org/b/isbn/9780590353427-L.jpg",
        },
        {
            "name":        "Charlotte's Web",
            "author":      "E.B. White",
            "description": "The tale of a pig named Wilbur and his spider friend Charlotte.",
            "price":       199.0,
            "stock":       40,
            "category":    "Children's Books",
            "image":       "https://covers.openlibrary.org/b/isbn/9780064400558-L.jpg",
        },
        {
            "name":        "The Little Prince",
            "author":      "Antoine de Saint-Exupéry",
            "description": "A pilot meets a young prince from a tiny asteroid.",
            "price":       249.0,
            "stock":       50,
            "category":    "Children's Books",
            "image":       "https://covers.openlibrary.org/b/isbn/9780156012195-L.jpg",
        },
        {
            "name":        "Charlie and the Chocolate Factory",
            "author":      "Roald Dahl",
            "description": "A young boy wins a tour of the most extraordinary chocolate factory.",
            "price":       229.0,
            "stock":       45,
            "category":    "Children's Books",
            "image":       "https://covers.openlibrary.org/b/isbn/9780142410318-L.jpg",
        },
        # ── Additional Fiction ─────────────────────────────────────────────
        {
            "name":        "The Catcher in the Rye",
            "author":      "J.D. Salinger",
            "description": "A teenager's raw account of alienation and loss of innocence in New York City.",
            "price":       279.0,
            "stock":       40,
            "category":    "Fiction",
            "image":       "https://covers.openlibrary.org/b/isbn/9780316769488-L.jpg",
        },
        {
            "name":        "Brave New World",
            "author":      "Aldous Huxley",
            "description": "A chilling vision of a future utopia controlled by technology and conditioning.",
            "price":       249.0,
            "stock":       35,
            "category":    "Fiction",
            "image":       "https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg",
        },
        {
            "name":        "The Alchemist",
            "author":      "Paulo Coelho",
            "description": "A shepherd boy's journey to find treasure and discover his personal legend.",
            "price":       299.0,
            "stock":       65,
            "category":    "Fiction",
            "image":       "https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg",
        },
        {
            "name":        "One Hundred Years of Solitude",
            "author":      "Gabriel García Márquez",
            "description": "A multigenerational saga of the Buendía family in the mythical town of Macondo.",
            "price":       399.0,
            "stock":       30,
            "category":    "Fiction",
            "image":       "https://covers.openlibrary.org/b/isbn/9780060883287-L.jpg",
        },
        {
            "name":        "Animal Farm",
            "author":      "George Orwell",
            "description": "An allegorical novella about a group of farm animals who rebel against their human farmer.",
            "price":       179.0,
            "stock":       55,
            "category":    "Fiction",
            "image":       "https://covers.openlibrary.org/b/isbn/9780451526342-L.jpg",
        },
        # ── Additional Mystery & Thriller ──────────────────────────────────
        {
            "name":        "The Silent Patient",
            "author":      "Alex Michaelides",
            "description": "A famous painter shoots her husband and then never speaks again.",
            "price":       369.0,
            "stock":       40,
            "category":    "Mystery & Thriller",
            "image":       "https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg",
        },
        {
            "name":        "And Then There Were None",
            "author":      "Agatha Christie",
            "description": "Ten strangers lured to an island are murdered one by one.",
            "price":       249.0,
            "stock":       45,
            "category":    "Mystery & Thriller",
            "image":       "https://covers.openlibrary.org/b/isbn/9780062073488-L.jpg",
        },
        {
            "name":        "The Girl on the Train",
            "author":      "Paula Hawkins",
            "description": "A woman becomes entangled in a missing persons investigation.",
            "price":       319.0,
            "stock":       30,
            "category":    "Mystery & Thriller",
            "image":       "https://covers.openlibrary.org/b/isbn/9781594634024-L.jpg",
        },
        # ── Additional Fantasy ─────────────────────────────────────────────
        {
            "name":        "The Lord of the Rings",
            "author":      "J.R.R. Tolkien",
            "description": "An epic quest to destroy the One Ring and save Middle-earth.",
            "price":       699.0,
            "stock":       20,
            "category":    "Fantasy",
            "image":       "https://covers.openlibrary.org/b/isbn/9780618640157-L.jpg",
        },
        {
            "name":        "The Chronicles of Narnia",
            "author":      "C.S. Lewis",
            "description": "Four children discover a magical land through a wardrobe.",
            "price":       549.0,
            "stock":       30,
            "category":    "Fantasy",
            "image":       "https://covers.openlibrary.org/b/isbn/9780066238500-L.jpg",
        },
        # ── Additional Science & Technology ────────────────────────────────
        {
            "name":        "Sapiens: A Visual History",
            "author":      "Yuval Noah Harari",
            "description": "The graphic adaptation of the groundbreaking original.",
            "price":       899.0,
            "stock":       15,
            "category":    "Science & Technology",
            "image":       "https://covers.openlibrary.org/b/isbn/9780063051331-L.jpg",
        },
        {
            "name":        "The Design of Everyday Things",
            "author":      "Don Norman",
            "description": "A powerful primer on how good design makes products intuitive.",
            "price":       549.0,
            "stock":       25,
            "category":    "Science & Technology",
            "image":       "https://covers.openlibrary.org/b/isbn/9780465050659-L.jpg",
        },
        # ── Additional Self-Help ───────────────────────────────────────────
        {
            "name":        "Deep Work",
            "author":      "Cal Newport",
            "description": "Rules for focused success in a distracted world.",
            "price":       399.0,
            "stock":       35,
            "category":    "Self-Help",
            "image":       "https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg",
        },
        {
            "name":        "The 7 Habits of Highly Effective People",
            "author":      "Stephen R. Covey",
            "description": "Powerful lessons in personal change and effectiveness.",
            "price":       449.0,
            "stock":       45,
            "category":    "Self-Help",
            "image":       "https://covers.openlibrary.org/b/isbn/9781982137274-L.jpg",
        },
        # ── Additional History ─────────────────────────────────────────────
        {
            "name":        "Educated",
            "author":      "Tara Westover",
            "description": "A memoir about growing up in a survivalist family and the transformative power of education.",
            "price":       429.0,
            "stock":       30,
            "category":    "History",
            "image":       "https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg",
        },
        {
            "name":        "The Art of War",
            "author":      "Sun Tzu",
            "description": "An ancient Chinese military treatise on strategy and tactics.",
            "price":       149.0,
            "stock":       60,
            "category":    "History",
            "image":       "https://covers.openlibrary.org/b/isbn/9781590302255-L.jpg",
        },
        # ── Additional Romance ─────────────────────────────────────────────
        {
            "name":        "The Fault in Our Stars",
            "author":      "John Green",
            "description": "Two teens with cancer fall in love at a support group.",
            "price":       299.0,
            "stock":       40,
            "category":    "Romance",
            "image":       "https://covers.openlibrary.org/b/isbn/9780525478812-L.jpg",
        },
        {
            "name":        "Outlander",
            "author":      "Diana Gabaldon",
            "description": "A WWII nurse is swept back in time to 18th-century Scotland.",
            "price":       449.0,
            "stock":       25,
            "category":    "Romance",
            "image":       "https://covers.openlibrary.org/b/isbn/9780440212560-L.jpg",
        },
        # ── Additional Children's Books ────────────────────────────────────
        {
            "name":        "Matilda",
            "author":      "Roald Dahl",
            "description": "A brilliant little girl with telekinetic powers takes on her cruel parents and headmistress.",
            "price":       219.0,
            "stock":       50,
            "category":    "Children's Books",
            "image":       "https://covers.openlibrary.org/b/isbn/9780142410370-L.jpg",
        },
        {
            "name":        "The Very Hungry Caterpillar",
            "author":      "Eric Carle",
            "description": "A caterpillar eats its way through a variety of foods before becoming a butterfly.",
            "price":       149.0,
            "stock":       70,
            "category":    "Children's Books",
            "image":       "https://covers.openlibrary.org/b/isbn/9780399226908-L.jpg",
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
            "image":       book.get("image", ""),
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
