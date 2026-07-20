#!/usr/bin/env python3
"""Convert an ASC one-time-use offer-code CSV into INSERT SQL for
offer_code_inventory. The CSV (as downloaded from App Store Connect) has no
header: column 1 = code, column 2 = full apps.apple.com/redeem URL.

Usage:
  python3 offer-codes-to-sql.py <csv> <monthly|yearly> <batch_id> <expires_at ISO> > out.sql

The generated SQL contains live redeemable codes — write it OUTSIDE the repo
(scratchpad) and run it via the Supabase SQL editor or psql. Never commit it.
ON CONFLICT DO NOTHING makes reloading a batch idempotent.
"""
import csv
import sys


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main() -> None:
    if len(sys.argv) != 5 or sys.argv[2] not in ("monthly", "yearly"):
        sys.exit(__doc__)
    path, product, batch_id, expires_at = sys.argv[1:5]
    expires_sql = "null" if expires_at.lower() == "null" else None

    rows = []
    with open(path, newline="") as f:
        for row in csv.reader(f):
            if len(row) < 2 or not row[0].strip():
                continue
            code, url = row[0].strip(), row[1].strip()
            if not url.startswith("https://apps.apple.com/redeem"):
                sys.exit(f"unexpected URL in row: {row}")
            rows.append((code, url))

    if not rows:
        sys.exit("no rows parsed")

    print("insert into public.offer_code_inventory (code, product, batch_id, redeem_url, expires_at) values")
    exp = expires_sql if expires_sql else q(expires_at)
    values = ",\n".join(
        f"  ({q(code)}, {q(product)}, {q(batch_id)}, {q(url)}, {exp})"
        for code, url in rows
    )
    print(values)
    print("on conflict (code) do nothing;")
    print(f"-- {len(rows)} codes, product={product}, batch={batch_id}", file=sys.stderr)


if __name__ == "__main__":
    main()
