#!/usr/bin/env python3
"""Fetch publications from ORCID and generate a Hugo markdown page."""

import json
import urllib.request
from collections import defaultdict

ORCID_ID = "0000-0002-2071-6407"
OUTPUT = "content/publications/index.md"

def fetch_works():
    """Fetch all works from ORCID API."""
    url = f"https://pub.orcid.org/v3.0/{ORCID_ID}/works"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def parse_work(group):
    """Extract key fields from an ORCID work group."""
    summary = group["work-summary"][0]
    title = summary.get("title", {}).get("title", {}).get("value", "Untitled")

    # Year
    pub_date = summary.get("publication-date") or {}
    year = pub_date.get("year", {}).get("value", "n.d.") if pub_date else "n.d."

    # Type
    work_type = summary.get("type", "other")

    # Journal
    journal = summary.get("journal-title", {})
    journal_name = journal.get("value", "") if journal else ""

    # DOI
    doi = None
    ext_ids = group.get("external-ids", {}).get("external-id", [])
    for eid in ext_ids:
        if eid.get("external-id-type") == "doi":
            doi = eid.get("external-id-value")
            break

    return {
        "title": title,
        "year": year,
        "type": work_type,
        "journal": journal_name,
        "doi": doi,
    }

def type_label(t):
    labels = {
        "journal-article": "Journal Articles",
        "book": "Books",
        "book-chapter": "Book Chapters",
        "conference-paper": "Conference Papers",
        "edited-book": "Edited Volumes",
        "other": "Other",
        "report": "Reports",
        "dissertation": "Dissertations",
    }
    return labels.get(t, t.replace("-", " ").title())

def generate_markdown(works):
    """Generate a Hugo markdown page from parsed works."""
    by_year = defaultdict(list)
    for w in works:
        by_year[w["year"]].append(w)

    lines = [
        "---",
        'title: "Publications"',
        'layout: "single"',
        'url: "/publications/"',
        'summary: "Publications fetched from ORCID"',
        "---",
        "",
        f"Publications fetched automatically from [ORCID](https://orcid.org/{ORCID_ID}). "
        f"Total: **{len(works)}** entries.",
        "",
    ]

    for year in sorted(by_year.keys(), reverse=True):
        lines.append(f"## {year}")
        lines.append("")
        for w in sorted(by_year[year], key=lambda x: x["title"]):
            title = w["title"]
            if w["doi"]:
                title = f'[{w["title"]}](https://doi.org/{w["doi"]})'
            journal_part = f" *{w['journal']}*." if w["journal"] else ""
            lines.append(f"- {title}.{journal_part}")
        lines.append("")

    return "\n".join(lines)

def main():
    print(f"Fetching works from ORCID {ORCID_ID}...")
    data = fetch_works()
    groups = data.get("group", [])
    print(f"Found {len(groups)} work groups.")

    works = [parse_work(g) for g in groups]
    md = generate_markdown(works)

    with open(OUTPUT, "w") as f:
        f.write(md)
    print(f"Written {len(works)} publications to {OUTPUT}")

if __name__ == "__main__":
    main()
