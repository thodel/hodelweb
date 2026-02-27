#!/usr/bin/env python3
"""Fetch publications from ORCID with detailed author information and generate Hugo markdown + JSON."""

import json
import os
import time
import urllib.request
from collections import defaultdict

ORCID_ID = "0000-0002-2071-6407"
OUTPUT_DE = "content/publikationen/index.de.md"
OUTPUT_EN = "content/publikationen/index.en.md"

def fetch_works():
    """Fetch the list of works from ORCID."""
    url = f"https://pub.orcid.org/v3.0/{ORCID_ID}/works"
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "hodelweb/1.0 (ORCID fetch script)"
        }
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def fetch_work_details(putcode):
    """Fetch detailed work information including contributors."""
    try:
        url = f"https://pub.orcid.org/v3.0/{ORCID_ID}/work/{putcode}"
        headers = {
            "Accept": "application/json",
            "User-Agent": "hodelweb/1.0 (ORCID fetch script)"
        }
        
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching work details for {putcode}: {e}")
        return None

def parse_work(group):
    """Extract key fields from an ORCID work group with detailed author info."""
    summary = group["work-summary"][0]
    putcode = summary.get("put-code")
    
    # Get basic info from summary
    title = summary.get("title", {}).get("title", {}).get("value", "Untitled")
    pub_date = summary.get("publication-date") or {}
    year = pub_date.get("year", {}).get("value", "n.d.") if pub_date else "n.d."
    work_type = summary.get("type", "other")
    journal = summary.get("journal-title", {})
    journal_name = journal.get("value", "") if journal else ""

    # Get DOI from summary
    doi = None
    ext_ids = group.get("external-ids", {}).get("external-id", [])
    for eid in ext_ids:
        if eid.get("external-id-type") == "doi":
            doi = eid.get("external-id-value")
            break

    # Fetch detailed work information for authors
    authors = []
    work_detail = fetch_work_details(putcode) if putcode else None
    if work_detail:
        contributors = work_detail.get("contributors", {})
        if contributors and "contributor" in contributors:
            contributor_list = contributors["contributor"]
            if not isinstance(contributor_list, list):
                contributor_list = [contributor_list]
                
            for contrib in contributor_list:
                contrib_attrs = contrib.get("contributor-attributes")
                if contrib_attrs:
                    role = contrib_attrs.get("contributor-role")
                    if role in ["author", "co-author"]:
                        name_data = contrib.get("contributor-name") or {}
                        credit_name = ""
                        if "credit-name" in name_data:
                            credit_name = name_data.get("credit-name", {}).get("value", "") or ""
                        if not credit_name and "credit-name" in contrib:
                            credit_name = contrib.get("credit-name", {}).get("value", "") or ""

                        given_names = name_data.get("given-names", {}).get("value", "") if name_data.get("given-names") else ""
                        family_name = name_data.get("family-name", {}).get("value", "") if name_data.get("family-name") else ""
                        full_name = credit_name or f"{given_names} {family_name}".strip()

                        if full_name:
                            # Check if it's Tobias Hodel to mark as primary author
                            is_primary = False
                            contrib_orcid = contrib.get("contributor-orcid", {})
                            if isinstance(contrib_orcid, dict):
                                orcid_path = contrib_orcid.get("path") or ""
                                if orcid_path == ORCID_ID:
                                    is_primary = True
                            if not is_primary:
                                lname = full_name.lower()
                                is_primary = "hodel" in lname and "tobias" in lname

                            authors.append({
                                "name": full_name,
                                "is_primary": is_primary
                            })
        # Small delay to avoid hitting ORCID rate limits
        time.sleep(0.1)

    return {
        "title": title,
        "year": year,
        "type": work_type,
        "journal": journal_name,
        "doi": doi,
        "authors": authors,
        "coauthored": len(authors) > 1
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

def format_authors(authors):
    """Format author list for display."""
    if not authors:
        return ""
    
    # Sort to put primary author (Tobias) first
    sorted_authors = sorted(authors, key=lambda a: (not a.get("is_primary", False), a["name"]))
    
    if len(sorted_authors) == 1:
        return sorted_authors[0]["name"]
    elif len(sorted_authors) == 2:
        return f"{sorted_authors[0]['name']} & {sorted_authors[1]['name']}"
    else:
        names = [a["name"] for a in sorted_authors[:-1]]
        return f"{', '.join(names)} & {sorted_authors[-1]['name']}"

def generate_markdown(works, lang="de"):
    """Generate a Hugo markdown page from parsed works."""
    by_year = defaultdict(list)
    for w in works:
        by_year[w["year"]].append(w)

    if lang == "de":
        lines = [
            "---",
            'title: "Publikationen"',
            "---",
            "",
            "# Publikationen",
            "",
            f"Vollständige Liste aller Publikationen von Tobias Hodel (ORCID: {ORCID_ID})",
            "",
        ]
    else:
        lines = [
            "---",
            'title: "Publications"',
            "---",
            "",
            "# Publications", 
            "",
            f"Complete list of publications by Tobias Hodel (ORCID: {ORCID_ID})",
            "",
        ]

    # Sort years in reverse order
    for year in sorted(by_year.keys(), reverse=True):
        if year == "n.d.":
            continue
        lines.append(f"## {year}")
        lines.append("")
        
        # Group by type within each year
        by_type = defaultdict(list)
        for work in by_year[year]:
            by_type[work["type"]].append(work)
        
        for work_type in sorted(by_type.keys()):
            type_name = type_label(work_type)
            if len(by_type) > 1:  # Only show type header if multiple types
                lines.append(f"### {type_name}")
                lines.append("")
            
            for work in by_type[work_type]:
                title = work["title"]
                authors_str = format_authors(work["authors"])
                
                if work["doi"]:
                    title = f"[{title}](https://doi.org/{work['doi']})"
                
                # Format citation
                if authors_str:
                    if work["coauthored"]:
                        citation = f"**{authors_str}** ({work['year']}). {title}"
                    else:
                        citation = f"{title} ({work['year']})"
                else:
                    citation = f"{title} ({work['year']})"
                
                if work["journal"]:
                    citation += f". *{work['journal']}*"
                
                lines.append(f"- {citation}")
        
        lines.append("")

    # Handle undated works
    if "n.d." in by_year:
        if lang == "de":
            lines.append("## Ohne Datum")
        else:
            lines.append("## No Date")
        lines.append("")
        
        for work in by_year["n.d."]:
            title = work["title"]
            authors_str = format_authors(work["authors"])
            
            if work["doi"]:
                title = f"[{title}](https://doi.org/{work['doi']})"
            
            if authors_str and work["coauthored"]:
                citation = f"**{authors_str}**. {title}"
            else:
                citation = title
                
            if work["journal"]:
                citation += f". *{work['journal']}*"
            
            lines.append(f"- {citation}")

    return "\n".join(lines)

def main():
    print(f"Fetching works from ORCID {ORCID_ID}...")
    data = fetch_works()
    groups = data.get("group", [])
    print(f"Found {len(groups)} work groups.")

    print("Fetching detailed work information (this may take a moment)...")
    works = []
    for i, group in enumerate(groups):
        work = parse_work(group)
        if work:
            works.append(work)
        if (i + 1) % 10 == 0:
            print(f"Processed {i + 1}/{len(groups)} works...")

    # Generate markdown files
    for lang, output in [("de", OUTPUT_DE), ("en", OUTPUT_EN)]:
        md = generate_markdown(works, lang=lang)
        os.makedirs(os.path.dirname(output), exist_ok=True)
        with open(output, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"Written {len(works)} publications to {output}")
    
    # Write publications JSON for dynamic loading
    os.makedirs("static", exist_ok=True)
    with open("static/publications.json", "w", encoding="utf-8") as f:
        json.dump(works, f, indent=2, ensure_ascii=False)
    print(f"Written {len(works)} publications to static/publications.json")

if __name__ == "__main__":
    main()
