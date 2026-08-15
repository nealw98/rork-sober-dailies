#!/usr/bin/env python3
"""Convert a Google Play one-time subscription promo-code export into SQL.

The generated rows are annual Android store codes for offer_code_inventory.
Google exports have varied between a one-code-per-line text file and a CSV, so
the parser accepts either and ignores common header labels.

Usage:
  python3 google-promo-codes-to-sql.py <csv-or-txt> <promotion_id> <expires_at ISO> > out.sql

The output contains live redeemable codes. Write it outside the repository and
run it through the Supabase SQL editor or psql; never commit the generated SQL.
"""
import csv
import re
import sys
from urllib.parse import quote


HEADERS = {"code", "promo code", "promotion code", "promotional code"}
CODE_RE = re.compile(r"[A-Za-z0-9_-]{4,64}")


def q(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    path, promotion_id, expires_at = sys.argv[1:4]
    expires_sql = "null" if expires_at.lower() == "null" else q(expires_at)

    codes: list[str] = []
    seen: set[str] = set()
    with open(path, newline="", encoding="utf-8-sig") as source:
        for row in csv.reader(source):
            for cell in row:
                code = cell.strip()
                if not code or code.lower() in HEADERS or not CODE_RE.fullmatch(code):
                    continue
                if code not in seen:
                    seen.add(code)
                    codes.append(code)

    if not codes:
        sys.exit("no Google Play promo codes parsed")

    print(
        "insert into public.offer_code_inventory "
        "(code, platform, product, batch_id, redeem_url, expires_at) values"
    )
    values = ",\n".join(
        "  ("
        f"{q(code)}, 'android', 'yearly', {q(promotion_id)}, "
        f"{q('https://play.google.com/redeem?code=' + quote(code))}, {expires_sql}"
        ")"
        for code in codes
    )
    print(values)
    print("on conflict (code) do nothing;")
    print(
        f"-- {len(codes)} codes, platform=android, product=yearly, promotion={promotion_id}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
