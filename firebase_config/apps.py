from django.apps import AppConfig


class FirebaseConfigConfig(AppConfig):
    name = "firebase_config"

    def ready(self):
        # Import firebase.py so the SDK is initialised when Django starts
        from firebase_config import firebase  # noqa: F401
