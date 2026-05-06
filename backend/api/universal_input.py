"""
RecruitGuard — Universal Input Handler
Handles ANY input type: URL, PDF, Image, Text
Auto-detects format and extracts job posting data.
"""

import re
import os
import io
from flask import Blueprint, request, jsonify
from typing import Optional

universal_bp = Blueprint('universal', __name__)


# ── URL Scraper ──────────────────────────────────────────────

def scrape_job_from_url(url: str) -> dict:
    """
    Scrape job posting details from a URL.
    Supports common job boards and generic pages.
    """
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError:
        return {"error": "requests and beautifulsoup4 are required for URL scraping"}

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except Exception as e:
        return {"error": f"Failed to fetch URL: {str(e)}"}

    soup = BeautifulSoup(response.text, "html.parser")

    # Remove script/style elements
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    # Try to extract structured data (JSON-LD)
    job_data = _extract_json_ld(soup)
    if job_data.get("title"):
        job_data["source"] = "json-ld"
        job_data["source_url"] = url
        return job_data

    # Fallback: extract from HTML
    job_data = _extract_from_html(soup, url)
    return job_data


def _extract_json_ld(soup) -> dict:
    """Extract job posting from JSON-LD structured data (used by LinkedIn, Indeed, etc.)."""
    import json
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            if isinstance(data, list):
                data = data[0]
            if data.get("@type") == "JobPosting":
                return {
                    "title": data.get("title", ""),
                    "company": data.get("hiringOrganization", {}).get("name", ""),
                    "description": _clean_html(data.get("description", "")),
                    "location": _format_location(data.get("jobLocation", {})),
                    "salary": _format_salary(data.get("baseSalary", {})),
                    "requirements": data.get("qualifications", ""),
                }
        except (json.JSONDecodeError, AttributeError):
            continue
    return {}


def _extract_from_html(soup, url: str) -> dict:
    """Fallback: extract job data from generic HTML."""
    # Title: try common patterns
    title = ""
    for selector in ["h1", ".job-title", ".posting-title", "[data-testid='jobTitle']",
                      ".top-card-layout__title", ".jobs-unified-top-card__job-title"]:
        el = soup.select_one(selector)
        if el:
            title = el.get_text(strip=True)
            break

    # Company: try common patterns
    company = ""
    for selector in [".company-name", ".employer-name", "[data-testid='company']",
                      ".topcard__org-name-link", ".jobs-unified-top-card__company-name",
                      ".top-card-layout__second-subline a"]:
        el = soup.select_one(selector)
        if el:
            company = el.get_text(strip=True)
            break

    # Description: largest text block
    paragraphs = soup.find_all("p")
    description = " ".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 50)

    if not description:
        main = soup.find("main") or soup.find("article") or soup.find("body")
        if main:
            description = main.get_text(separator=" ", strip=True)[:3000]

    # Clean boilerplate text from job boards
    boilerplate_patterns = [
        r"By clicking Continue to join or sign in.*?Cookie Policy\.",
        r"Referrals increase your chances.*?by \d+x",
        r"Never miss a job alert.*?Windows\.",
        r"Find curated posts.*?one place\.",
        r"You agree to LinkedIn.*?Cookie Policy\.",
        r"Sign in to view.*?details\.",
    ]
    if description:
        for pattern in boilerplate_patterns:
            description = re.sub(pattern, "", description, flags=re.IGNORECASE | re.DOTALL)
        # Remove duplicate spaces
        description = re.sub(r'\s{2,}', ' ', description).strip()

    # Try to extract company from description if not found
    if not company and description:
        company_match = re.search(r'(?:at|company[:\s]+|employer[:\s]+)\s*([A-Z][a-zA-Z0-9\s&]+(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Technologies|Solutions|Staff)?)', description)
        if company_match:
            company = company_match.group(1).strip()

    return {
        "title": title or "Untitled Job",
        "company": company,
        "description": description[:3000] if description else "",
        "requirements": "",
        "salary": "",
        "location": "",
        "source": "html-scrape",
        "source_url": url,
    }


def _clean_html(text: str) -> str:
    """Remove HTML tags from text."""
    from bs4 import BeautifulSoup
    return BeautifulSoup(text, "html.parser").get_text(separator=" ", strip=True)


def _format_location(loc) -> str:
    """Format JSON-LD location."""
    if isinstance(loc, dict):
        addr = loc.get("address", {})
        if isinstance(addr, dict):
            parts = [addr.get("addressLocality", ""), addr.get("addressRegion", ""), addr.get("addressCountry", "")]
            return ", ".join(p for p in parts if p)
    if isinstance(loc, list) and loc:
        return _format_location(loc[0])
    return str(loc) if loc else ""


def _format_salary(sal) -> str:
    """Format JSON-LD salary."""
    if isinstance(sal, dict):
        value = sal.get("value", {})
        if isinstance(value, dict):
            min_v = value.get("minValue", "")
            max_v = value.get("maxValue", "")
            currency = sal.get("currency", "USD")
            if min_v and max_v:
                return f"{currency} {min_v} - {max_v}"
        return str(value) if value else ""
    return str(sal) if sal else ""


# ── PDF Parser ───────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    try:
        import pdfplumber
    except ImportError:
        return "[Error] pdfplumber is required for PDF parsing"

    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    return " ".join(text_parts)


# ── Image OCR ────────────────────────────────────────────────

def extract_text_from_image(file_bytes: bytes) -> str:
    """Extract text from an image using OCR."""
    try:
        from PIL import Image
        import pytesseract
    except ImportError:
        # Fallback: try easyocr
        try:
            import easyocr
            reader = easyocr.Reader(['en'], gpu=False)
            result = reader.readtext(file_bytes, detail=0)
            return " ".join(result)
        except ImportError:
            return "[Error] Install pytesseract or easyocr for image OCR"

    image = Image.open(io.BytesIO(file_bytes))
    text = pytesseract.image_to_string(image)
    return text.strip()


# ── Smart Text Parser ────────────────────────────────────────

def parse_job_from_text(raw_text: str) -> dict:
    """
    Attempt to extract structured job fields from raw text.
    Works for pasted text, PDF content, or OCR output.
    """
    lines = raw_text.strip().split("\n")
    lines = [l.strip() for l in lines if l.strip()]

    job = {
        "title": "",
        "company": "",
        "description": raw_text[:3000],
        "requirements": "",
        "salary": "",
        "location": "",
        "email": "",
    }

    # Try to find title (usually first non-empty line)
    if lines:
        job["title"] = lines[0][:100]

    # Try to find salary
    salary_match = re.search(r'[\$₹€£]\s*[\d,]+(?:\s*[-–to]+\s*[\$₹€£]?\s*[\d,]+)?(?:\s*/\s*(?:year|month|week|hr|hour))?', raw_text, re.IGNORECASE)
    if salary_match:
        job["salary"] = salary_match.group().strip()

    # Try to find email
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', raw_text)
    if email_match:
        job["email"] = email_match.group()

    # Try to find location
    location_patterns = [
        r'(?:location|based in|office)\s*[:\-]\s*(.+?)(?:\n|$)',
        r'((?:remote|hybrid|on-?site)(?:\s*[-–]\s*\w[\w\s,]+)?)',
    ]
    for pattern in location_patterns:
        loc_match = re.search(pattern, raw_text, re.IGNORECASE)
        if loc_match:
            job["location"] = loc_match.group(1).strip()[:100]
            break

    # Try to find requirements section
    req_match = re.search(r'(?:requirements?|qualifications?|what you.?ll need|must have)\s*[:\-]?\s*(.+?)(?:\n\n|$)', raw_text, re.IGNORECASE | re.DOTALL)
    if req_match:
        job["requirements"] = req_match.group(1).strip()[:1000]

    return job


# ── API Routes ───────────────────────────────────────────────

@universal_bp.route('/parse-url', methods=['POST'])
def parse_url():
    """Scrape a job posting from a URL and analyze it."""
    data = request.json or {}
    url = data.get("url", "").strip()

    if not url:
        return jsonify({"error": "URL is required"}), 400

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    job_data = scrape_job_from_url(url)

    if "error" in job_data:
        return jsonify(job_data), 400

    return jsonify({
        "status": "success",
        "job": job_data,
        "message": f"Extracted job data from {url}"
    })


@universal_bp.route('/parse-file', methods=['POST'])
def parse_file():
    """Parse job data from uploaded PDF or Image file."""
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    filename = file.filename.lower()
    file_bytes = file.read()

    if not file_bytes:
        return jsonify({"error": "Empty file"}), 400

    # Detect file type and extract text
    if filename.endswith('.pdf'):
        raw_text = extract_text_from_pdf(file_bytes)
        file_type = "pdf"
    elif filename.endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff')):
        raw_text = extract_text_from_image(file_bytes)
        file_type = "image"
    else:
        # Try as plain text
        try:
            raw_text = file_bytes.decode("utf-8")
            file_type = "text"
        except UnicodeDecodeError:
            return jsonify({"error": "Unsupported file format. Use PDF, image, or text files."}), 400

    if not raw_text or raw_text.startswith("[Error]"):
        return jsonify({"error": raw_text or "Could not extract text from file"}), 400

    # Parse structured job data from raw text
    job_data = parse_job_from_text(raw_text)
    job_data["source"] = file_type
    job_data["source_file"] = file.filename

    return jsonify({
        "status": "success",
        "job": job_data,
        "raw_text": raw_text[:2000],
        "file_type": file_type,
        "message": f"Extracted job data from {file_type.upper()} file"
    })
