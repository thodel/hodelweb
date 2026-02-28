#!/usr/bin/env python3
"""Enrich publication authors using Crossref/OpenAlex when missing or when DOI is present."""

from __future__ import annotations

import difflib
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ORCID_ID = "0000-0002-2071-6407"
STATIC_JSON = Path("static/publications.json")
PUBLIC_JSON = Path("public/publications.json")
USER_AGENT = "hodelweb/1.0 (author enrichment)"

# Tuning thresholds
TITLE_SIM_THRESHOLD = 0.90
TITLE_SIM_STRICT = 0.95  # for DOI matches or overriding existing authors
REQUEST_DELAY_SEC = 0.15


def normalize_title(title: str) -> str:
    """Normalize title for fuzzy matching."""
    title = title or ""
    title = title.lower()
    title = unicodedata.normalize("NFKD", title)
    title = "".join(c for c in title if not unicodedata.combining(c))
    title = re.sub(r"[^a-z0-9]+", " ", title)
    title = re.sub(r"\s+", " ", title).strip()
    return title


def title_similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, normalize_title(a), normalize_title(b)).ratio()


def year_ok(pub_year: str | None, candidate_year: int | None) -> bool:
    if not pub_year or pub_year.lower() == "n.d." or candidate_year is None:
        return True
    try:
        return int(pub_year) == int(candidate_year)
    except ValueError:
        return True


def http_get_json(url: str) -> dict | None:
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def crossref_work_by_doi(doi: str) -> dict | None:
    url = f"https://api.crossref.org/works/{urllib.parse.quote(doi)}"
    data = http_get_json(url)
    if not data or "message" not in data:
        return None
    return data["message"]


def crossref_search_by_title(title: str, rows: int = 5) -> list[dict]:
    params = {
        "query.title": title,
        "rows": str(rows),
    }
    url = "https://api.crossref.org/works?" + urllib.parse.urlencode(params)
    data = http_get_json(url)
    if not data:
        return []
    return data.get("message", {}).get("items", []) or []


def openalex_search_by_title(title: str, rows: int = 5) -> list[dict]:
    params = {
        "search": title,
        "per_page": str(rows),
    }
    url = "https://api.openalex.org/works?" + urllib.parse.urlencode(params)
    data = http_get_json(url)
    if not data:
        return []
    return data.get("results", []) or []


def extract_crossref_authors(item: dict) -> list[dict]:
    authors = item.get("author", []) or []
    if not authors:
        # Fallback to editors when no authors are present
        authors = item.get("editor", []) or []

    results = []
    seen = set()
    for a in authors:
        given = (a.get("given") or "").strip()
        family = (a.get("family") or "").strip()
        name = (a.get("name") or "").strip()
        full_name = name or (f"{given} {family}".strip())
        if not full_name:
            continue
        key = normalize_title(full_name)
        if key in seen:
            continue
        seen.add(key)

        is_primary = False
        orcid = (a.get("ORCID") or "").replace("https://orcid.org/", "")
        if orcid == ORCID_ID:
            is_primary = True
        elif "tobias" in full_name.lower() and "hodel" in full_name.lower():
            is_primary = True

        results.append({"name": full_name, "is_primary": is_primary})

    return results


def extract_openalex_authors(item: dict) -> list[dict]:
    authorships = item.get("authorships", []) or []
    results = []
    seen = set()
    for auth in authorships:
        author = auth.get("author", {}) or {}
        full_name = (author.get("display_name") or "").strip()
        if not full_name:
            continue
        key = normalize_title(full_name)
        if key in seen:
            continue
        seen.add(key)

        is_primary = False
        orcid = (author.get("orcid") or "").replace("https://orcid.org/", "")
        if orcid == ORCID_ID:
            is_primary = True
        elif "tobias" in full_name.lower() and "hodel" in full_name.lower():
            is_primary = True

        results.append({"name": full_name, "is_primary": is_primary})
    return results


def crossref_year(item: dict) -> int | None:
    issued = item.get("issued", {})
    parts = issued.get("date-parts") or []
    if parts and parts[0]:
        try:
            return int(parts[0][0])
        except Exception:
            return None
    return None


def openalex_year(item: dict) -> int | None:
    year = item.get("publication_year")
    try:
        return int(year)
    except Exception:
        return None


def best_match_by_title(items: list[dict], pub_title: str, pub_year: str | None, title_getter) -> tuple[dict | None, float]:
    best_item = None
    best_score = 0.0
    for item in items:
        title = title_getter(item)
        if not title:
            continue
        score = title_similarity(pub_title, title)
        if score > best_score:
            best_score = score
            best_item = item
    if best_item is None:
        return None, 0.0

    # Require a solid title match, and a matching year if we have one
    year = None
    if title_getter == crossref_title:
        year = crossref_year(best_item)
    elif title_getter == openalex_title:
        year = openalex_year(best_item)

    if best_score < TITLE_SIM_THRESHOLD:
        return None, best_score
    if not year_ok(pub_year, year):
        return None, best_score
    return best_item, best_score


def crossref_title(item: dict) -> str:
    titles = item.get("title", []) or []
    if titles:
        return titles[0]
    return ""


def openalex_title(item: dict) -> str:
    return item.get("display_name") or ""


def enrich_publications(publications: list[dict]) -> tuple[list[dict], dict]:
    report = {
        "updated": 0,
        "filled_empty": 0,
        "skipped_no_match": 0,
        "source_counts": {"crossref-doi": 0, "crossref-title": 0, "openalex-title": 0},
        "unresolved": [],
    }

    crossref_cache = {}

    for pub in publications:
        title = pub.get("title", "")
        year = pub.get("year")
        doi = pub.get("doi")
        existing_authors = pub.get("authors") or []
        had_authors = len(existing_authors) > 0

        new_authors = None
        source = None

        # 1) DOI-based Crossref lookup (authoritative for DOI records)
        if doi:
            if doi not in crossref_cache:
                crossref_cache[doi] = crossref_work_by_doi(doi)
                time.sleep(REQUEST_DELAY_SEC)
            item = crossref_cache[doi]
            if item:
                cr_title = crossref_title(item)
                score = title_similarity(title, cr_title)
                if score >= TITLE_SIM_STRICT and year_ok(year, crossref_year(item)):
                    authors = extract_crossref_authors(item)
                    if authors:
                        new_authors = authors
                        source = "crossref-doi"

        # 2) Title-based Crossref lookup (only when missing authors)
        if new_authors is None and not had_authors:
            items = crossref_search_by_title(title, rows=5)
            time.sleep(REQUEST_DELAY_SEC)
            item, score = best_match_by_title(items, title, year, crossref_title)
            if item:
                authors = extract_crossref_authors(item)
                if authors:
                    new_authors = authors
                    source = "crossref-title"

        # 3) Title-based OpenAlex lookup (only when missing authors)
        if new_authors is None and not had_authors:
            items = openalex_search_by_title(title, rows=5)
            time.sleep(REQUEST_DELAY_SEC)
            item, score = best_match_by_title(items, title, year, openalex_title)
            if item:
                authors = extract_openalex_authors(item)
                if authors:
                    new_authors = authors
                    source = "openalex-title"

        if new_authors:
            pub["authors"] = new_authors
            pub["coauthored"] = len(new_authors) > 1
            report["updated"] += 1
            if not had_authors:
                report["filled_empty"] += 1
            report["source_counts"][source] += 1
        else:
            if not had_authors:
                report["skipped_no_match"] += 1
                report["unresolved"].append(title)

    return publications, report


def main() -> None:
    if not STATIC_JSON.exists():
        raise SystemExit(f"Missing {STATIC_JSON}")

    publications = json.loads(STATIC_JSON.read_text(encoding="utf-8"))
    publications, report = enrich_publications(publications)

    STATIC_JSON.write_text(
        json.dumps(publications, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    if PUBLIC_JSON.exists():
        PUBLIC_JSON.write_text(
            json.dumps(publications, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    print("Enrichment report:")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
