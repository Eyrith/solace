from typing import Any

GAME_TEMPLATE_CATALOG: dict[str, dict[str, Any]] = {
    "game-trivia-01": {
        "id": "game-trivia-01",
        "title": "How Well Do We Remember Us?",
        "game_type": "couple_trivia",
        "question_ids": [
            "00000000-0000-4000-8000-000000000201",
            "00000000-0000-4000-8000-000000000202",
            "00000000-0000-4000-8000-000000000203",
            "00000000-0000-4000-8000-000000000204",
            "00000000-0000-4000-8000-000000000205",
        ],
    },
    "game-wyr-01": {
        "id": "game-wyr-01",
        "title": "Would You Rather: Intimate & Whimsical",
        "game_type": "would_you_rather",
        "question_ids": [
            "00000000-0000-4000-8000-000000000206",
            "00000000-0000-4000-8000-000000000207",
            "00000000-0000-4000-8000-000000000208",
            "00000000-0000-4000-8000-000000000209",
        ],
    },
    "game-compat-01": {
        "id": "game-compat-01",
        "title": "Emotional Compatibility & Love Languages",
        "game_type": "compatibility",
        "question_ids": [
            "00000000-0000-4000-8000-000000000210",
            "00000000-0000-4000-8000-000000000211",
            "00000000-0000-4000-8000-000000000212",
            "00000000-0000-4000-8000-000000000213",
        ],
    },
    "game-tod-01": {
        "id": "game-tod-01",
        "title": "Truth or Dare: Tender & Playful",
        "game_type": "truth_or_dare",
        "question_ids": [
            "00000000-0000-4000-8000-000000000214",
            "00000000-0000-4000-8000-000000000215",
            "00000000-0000-4000-8000-000000000216",
            "00000000-0000-4000-8000-000000000217",
        ],
    },
}

DEFAULT_QUESTION_IDS: list[str] = [
    f"00000000-0000-4000-8000-000000000{idx}" for idx in range(101, 128)
]

