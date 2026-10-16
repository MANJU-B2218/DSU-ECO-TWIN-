import requests
import json
import re
import io
from PIL import Image

# Let's test uploading an image to Google Lens and following redirects
img = Image.new('RGB', (224, 224), color=(20, 100, 220))
buf = io.BytesIO()
img.save(buf, format='JPEG')
buf.seek(0)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

# Post to Google Lens
resp = requests.post(
    'https://lens.google.com/upload',
    headers=headers,
    files={'encoded_image': ('image.jpg', buf, 'image/jpeg')},
    allow_redirects=True,
    timeout=10
)

print("URL:", resp.url)
print("Status:", resp.status_code)

# Try fetching with headers
if 'google.com/search' in resp.url:
    r = requests.get(resp.url, headers=headers, timeout=10)
    print("Search page status:", r.status_code)
    # Check for visual matches or knowledge graph
    with open("google_search_output.html", "w", encoding="utf-8") as f:
        f.write(r.text)
    print("Saved to google_search_output.html, size:", len(r.text))
