from bs4 import BeautifulSoup
import re

with open("google_search_output.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

# Search for any titles, headings, links, or text
print("Page Title:", soup.title.string if soup.title else "No title")

# Look for all spans, divs, h2, h3 with text
texts = []
for tag in soup.find_all(['h1', 'h2', 'h3', 'div', 'span', 'a']):
    t = tag.get_text(strip=True)
    if t and 4 < len(t) < 60 and not any(k in t.lower() for k in ['google', 'javascript', 'privacy', 'terms', 'cookie', 'settings', 'redirect']):
        if t not in texts:
            texts.append(t)

print(f"Total extracted text tokens: {len(texts)}")
for t in texts[:25]:
    print(" ->", t)
