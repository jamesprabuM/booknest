from django.core.management.base import BaseCommand, CommandError

from firebase_config.firebase import db, Collections


class Command(BaseCommand):
    help = "Promote a Firestore user to admin by email."

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="Email address of the user to promote.")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        if not email:
            raise CommandError("Email is required.")

        docs = (
            db.collection(Collections.USERS)
            .where("email", "==", email)
            .limit(1)
            .get()
        )

        if not docs:
            raise CommandError(f"User not found for email: {email}")

        doc = docs[0]
        doc.reference.update({"is_admin": True})

        self.stdout.write(self.style.SUCCESS(f"Promoted {email} to admin (user_id={doc.id})."))
