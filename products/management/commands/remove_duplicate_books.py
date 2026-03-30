from collections import defaultdict

from django.core.management.base import BaseCommand
from firebase_admin import firestore as fb_firestore

from firebase_config.firebase import db, Collections


def _norm(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


class Command(BaseCommand):
    help = (
        "Remove duplicate products by normalized (name, author), "
        "relink references to a keeper product, and optionally merge stock."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show changes without writing to Firestore.",
        )
        parser.add_argument(
            "--no-merge-stock",
            action="store_true",
            help="Do not merge duplicate stock into keeper product.",
        )

    def _relink_collection(self, collection_name, duplicate_id, keeper_id, dry_run):
        docs = (
            db.collection(collection_name)
            .where("product_id", "==", duplicate_id)
            .get()
        )
        count = 0
        for doc in docs:
            count += 1
            if not dry_run:
                doc.reference.update({"product_id": keeper_id})
        return count

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        merge_stock = not options["no_merge_stock"]

        product_docs = list(db.collection(Collections.PRODUCTS).get())
        if not product_docs:
            self.stdout.write(self.style.WARNING("No products found."))
            return

        groups = defaultdict(list)
        for doc in product_docs:
            data = doc.to_dict() or {}
            key = (_norm(data.get("name", "")), _norm(data.get("author", "")))
            if key[0] and key[1]:
                groups[key].append(doc)

        duplicate_groups = {k: v for k, v in groups.items() if len(v) > 1}
        if not duplicate_groups:
            self.stdout.write(self.style.SUCCESS("No duplicate books found."))
            return

        removed_products = 0
        relinked_cart = 0
        relinked_wishlist = 0
        relinked_orders = 0

        for (name, author), docs in duplicate_groups.items():
            docs_sorted = sorted(docs, key=lambda d: d.id)
            keeper = docs_sorted[0]
            duplicates = docs_sorted[1:]
            keeper_data = keeper.to_dict() or {}

            self.stdout.write(
                f"Book '{name}' by '{author}' -> keep {keeper.id}, remove {len(duplicates)} duplicate(s)."
            )

            if merge_stock:
                extra_stock = 0
                for dup in duplicates:
                    dup_stock = (dup.to_dict() or {}).get("stock", 0)
                    if isinstance(dup_stock, (int, float)):
                        extra_stock += int(dup_stock)
                if extra_stock:
                    if not dry_run:
                        db.collection(Collections.PRODUCTS).document(keeper.id).update(
                            {"stock": fb_firestore.Increment(extra_stock)}
                        )
                    self.stdout.write(f"  merged stock +{extra_stock} into keeper")

            for dup in duplicates:
                relinked_cart += self._relink_collection(Collections.CART_ITEMS, dup.id, keeper.id, dry_run)
                relinked_wishlist += self._relink_collection(Collections.WISHLIST_ITEMS, dup.id, keeper.id, dry_run)
                relinked_orders += self._relink_collection(Collections.ORDER_ITEMS, dup.id, keeper.id, dry_run)

                removed_products += 1
                if not dry_run:
                    dup.reference.delete()

        mode = "DRY RUN" if dry_run else "APPLIED"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode}: removed {removed_products} duplicate product(s); "
                f"relinked cart={relinked_cart}, wishlist={relinked_wishlist}, order_items={relinked_orders}."
            )
        )
