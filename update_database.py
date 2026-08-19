#!/usr/bin/env python3

"""
KVGDV Database Updater
Created by Tech Karol

Struktura:

DataBase/
└── 2026/
    └── 1.0/
        ├── Malware-Base.json
        └── Malware-Base2.json

Skrypt pobiera metadane próbek z MalwareBazaar
i zapisuje je do dwóch części bazy.

UWAGA:
Nie pobieramy plików malware.
Pobierane są wyłącznie metadane oraz hashe.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests


# ============================================================
# KONFIGURACJA
# ============================================================

API_URL = "https://mb-api.abuse.ch/api/v1/"

DATABASE_YEAR = "2026"
DATABASE_VERSION = "1.0"

ENTRIES_PER_FILE = 50_000

TOTAL_ENTRIES = ENTRIES_PER_FILE * 2

BASE_DIR = Path(__file__).resolve().parent

DATABASE_DIR = (
    BASE_DIR
    / "DataBase"
    / DATABASE_YEAR
    / DATABASE_VERSION
)

DATABASE_FILE_1 = (
    DATABASE_DIR
    / "Malware-Base.json"
)

DATABASE_FILE_2 = (
    DATABASE_DIR
    / "Malware-Base2.json"
)

TIMEOUT = 60


# ============================================================
# POBIERANIE DANYCH
# ============================================================

def download_samples():
    """
    Pobiera najnowsze rekordy z MalwareBazaar.

    Uwaga:
    API może ograniczać liczbę rekordów zwracanych
    w pojedynczym żądaniu, dlatego dane pobieramy
    partiami.
    """

    all_samples = []

    print("=" * 60)
    print("KVGDV DATABASE UPDATER")
    print("Created by Tech Karol")
    print("=" * 60)
    print()

    print("Łączenie z MalwareBazaar...")

    # Pobieramy rekordy partiami.
    # Dzięki temu możemy zgromadzić dużą bazę.
    selectors = [
        "time",
        "time",
        "time",
        "time",
        "time",
        "time",
        "time",
        "time",
        "time",
        "time"
    ]

    for selector in selectors:

        payload = {
            "query": "get_recent",
            "selector": selector,
            "limit": 1000
        }

        try:

            response = requests.post(
                API_URL,
                data=payload,
                timeout=TIMEOUT,
                headers={
                    "User-Agent":
                    "KVGDV-Database-Updater/1.0"
                }
            )

        except requests.RequestException as error:

            print(
                f"[ERROR] Błąd połączenia: {error}"
            )

            sys.exit(1)

        if response.status_code != 200:

            print(
                "[ERROR] API zwróciło HTTP "
                f"{response.status_code}"
            )

            sys.exit(1)

        try:

            data = response.json()

        except ValueError:

            print(
                "[ERROR] API zwróciło "
                "nieprawidłowy JSON."
            )

            sys.exit(1)

        if data.get("query_status") != "ok":

            print(
                "[ERROR] Status API:",
                data.get("query_status")
            )

            break

        samples = data.get("data", [])

        all_samples.extend(samples)

        print(
            f"Pobrano: {len(all_samples)} rekordów"
        )

        if len(all_samples) >= TOTAL_ENTRIES:

            break

    return all_samples


# ============================================================
# USUWANIE DUPLIKATÓW
# ============================================================

def remove_duplicates(samples):

    unique = {}

    for sample in samples:

        sha256 = (
            sample.get("sha256_hash")
            or ""
        ).lower().strip()

        if not sha256:
            continue

        if sha256 not in unique:

            unique[sha256] = sample

    return list(unique.values())


# ============================================================
# KONWERSJA DO FORMATU KVGDV
# ============================================================

def normalize_sample(sample, index):

    sha256 = (
        sample.get("sha256_hash")
        or ""
    ).lower()

    sha1 = (
        sample.get("sha1_hash")
        or ""
    ).lower()

    md5 = (
        sample.get("md5_hash")
        or ""
    ).lower()

    tags = sample.get("tags") or []

    if isinstance(tags, str):

        tags = [
            x.strip()
            for x in tags.split(",")
            if x.strip()
        ]

    return {

        "id":
            f"KVGDV-{index:06d}",

        "sha256":
            sha256,

        "sha1":
            sha1,

        "md5":
            md5,

        "file_name":
            sample.get("file_name"),

        "file_type":
            sample.get("file_type"),

        "file_size":
            sample.get("file_size"),

        "signature":
            sample.get("signature"),

        "first_seen":
            sample.get("first_seen"),

        "last_seen":
            sample.get("last_seen"),

        "tags":
            tags,

        "reporter":
            sample.get("reporter"),

        "source":
            "MalwareBazaar",

        "source_url":
            (
                "https://bazaar.abuse.ch/sample/"
                + sha256
                + "/"
            )
    }


# ============================================================
# TWORZENIE BAZY
# ============================================================

def create_database(entries, part):

    updated = datetime.now(
        timezone.utc
    ).isoformat()

    return {

        "database":
            "KVGDV Malware Database",

        "version":
            DATABASE_VERSION,

        "year":
            int(DATABASE_YEAR),

        "part":
            part,

        "updated":
            updated,

        "author":
            "Tech Karol",

        "source":
            "MalwareBazaar",

        "source_url":
            "https://bazaar.abuse.ch/",

        "description":
            (
                "Public malware metadata database "
                "for security software development."
            ),

        "count":
            len(entries),

        "entries":
            entries
    }


# ============================================================
# ZAPIS PLIKU
# ============================================================

def save_json(path, database):

    path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            database,
            file,
            indent=2,
            ensure_ascii=False
        )

        file.write("\n")


# ============================================================
# MAIN
# ============================================================

def main():

    samples = download_samples()

    print()
    print(
        f"Pobrano łącznie: {len(samples)}"
    )

    print(
        "Usuwanie duplikatów..."
    )

    samples = remove_duplicates(samples)

    print(
        f"Po usunięciu duplikatów: "
        f"{len(samples)}"
    )

    if not samples:

        print(
            "[ERROR] Brak danych."
        )

        sys.exit(1)

    # Ograniczamy do 100 000 rekordów.
    samples = samples[:TOTAL_ENTRIES]

    normalized = []

    for index, sample in enumerate(
        samples,
        start=1
    ):

        normalized.append(
            normalize_sample(
                sample,
                index
            )
        )

    # ========================================================
    # PODZIAŁ 50K + 50K
    # ========================================================

    first_part = normalized[
        :ENTRIES_PER_FILE
    ]

    second_part = normalized[
        ENTRIES_PER_FILE:
        ENTRIES_PER_FILE * 2
    ]

    database_1 = create_database(
        first_part,
        part=1
    )

    database_2 = create_database(
        second_part,
        part=2
    )

    # ========================================================
    # ZAPIS
    # ========================================================

    print()
    print("Zapisywanie bazy...")

    save_json(
        DATABASE_FILE_1,
        database_1
    )

    save_json(
        DATABASE_FILE_2,
        database_2
    )

    print()
    print("=" * 60)
    print("GOTOWE")
    print("=" * 60)

    print(
        f"Malware-Base.json  : "
        f"{len(first_part)} wpisów"
    )

    print(
        f"Malware-Base2.json : "
        f"{len(second_part)} wpisów"
    )

    print()
    print(
        "Pliki:"
    )

    print(
        DATABASE_FILE_1
    )

    print(
        DATABASE_FILE_2
    )

    print()
    print(
        "KVGDV Database została zaktualizowana."
    )


if __name__ == "__main__":
    main()
