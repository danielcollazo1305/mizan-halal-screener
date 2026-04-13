# rules.py
PROHIBITED_SECTORS = [
    "financial services", "banks", "banking",
    "insurance", "gambling", "alcohol",
    "beverages - wineries & distilleries",
    "tobacco", "adult entertainment", "casino",
    "credit services", "capital markets",
    "mortgage finance", "consumer finance",
]

QUESTIONABLE_SECTORS = [
    "communication services",
    "internet content & information",
    "consumer cyclical", "entertainment",
    "broadcasting", "travel services",
    "lodging", "restaurants", "specialty retail",
    "packaged foods", "media",
]

MAX_DEBT_RATIO = 0.50             # acima de 50% → HARAM
MAX_QUESTIONABLE_DEBT_RATIO = 0.30  # acima de 30% → QUESTIONABLE