import os

# Business Logic
INTEREST_RATE = 0.15
EDU_KEYWORDS = [
    "degree", "course", "college", "tuition", "study", 
    "university", "school", "mba", "masters"
]

# AI / Vector Search
EMBEDDING_MODEL = "models/text-embedding-004"
MATCH_THRESHOLD = 0.5
MATCH_COUNT = 5

# Security
# In production, this should be a list of allowed origins e.g. ["https://myapp.com"]
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
