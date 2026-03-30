from collections import defaultdict

from django.core.management.base import BaseCommand

from firebase_config.firebase import db, Collections


def _normalize_name(name: str) -> str:
    return " ".join((name or "").strip().lower().split())


class Command(BaseCommand):
    help = (
        "Removes duplicate category documents by normalized category name, "
        "reassigning product.category_id references to the kept category."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change without writing to Firestore.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        category_docs = list(db.collection(Collections.CATEGORIES).get())
        if not category_docs:
            self.stdout.write(self.style.WARNING("No categories found."))
            return

        groups = defaultdict(list)
        for doc in category_docs:
            data = doc.to_dict() or {}
            key = _normalize_name(data.get("category_name", ""))
            groups[key].append(doc)

        duplicate_groups = {k: v for k, v in groups.items() if k and len(v) > 1}
        if not duplicate_groups:
            self.stdout.write(self.style.SUCCESS("No duplicate category names found."))
            return

        moved_products = 0
        removed_categories = 0

        for normalized_name, docs in duplicate_groups.items():
            # Deterministic keeper: smallest document ID.
            docs_sorted = sorted(docs, key=lambda d: d.id)
            keeper = docs_sorted[0]
            duplicates = docs_sorted[1:]

            self.stdout.write(
                f"Category '{normalized_name}' -> keep {keeper.id}, remove {len(duplicates)} duplicate(s)."
            )

            for duplicate in duplicates:
                # Move all products from duplicate category_id to keeper category_id.
                product_docs = list(
                    db.collection(Collections.PRODUCTS)
                    .where("category_id", "==", duplicate.id)
                    .get()
                )

                for product_doc in product_docs:
                    moved_products += 1
                    if not dry_run:
                        product_doc.reference.update({"category_id": keeper.id})

                removed_categories += 1
                if not dry_run:
                    duplicate.reference.delete()

        mode = "DRY RUN" if dry_run else "APPLIED"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode}: reassigned {moved_products} product(s), removed {removed_categories} duplicate category document(s)."
            )
        )
