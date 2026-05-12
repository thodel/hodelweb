"""
VLM Text Recognition — parallel query across three models.

Usage:
    python src/vlm.py <image_path> [--prompt "..."]

Output: transcribed text from each model, printed to stdout.
"""

import argparse
import asyncio
import base64
import io
import os
import sys

from dotenv import load_dotenv
from PIL import Image

load_dotenv()

GEMINI_KEY  = os.getenv("GEMINI_API_KEY", "")
QWEN_KEY    = os.getenv("QWEN_API_KEY", "")
MISTRAL_KEY = os.getenv("MISTRAL_API_KEY", "")

DEFAULT_PROMPT = (
    "Transcribe all text in this image exactly as written. "
    "Preserve line breaks and the spatial layout of the form. "
    "For handwritten digits, distinguish carefully: 1/7, 3/8, 6/0. "
    "Return only the transcribed text, no commentary."
)


# ── image loading ─────────────────────────────────────────────────────────────

def load_image(path: str) -> Image.Image:
    return Image.open(path).convert("RGB")

def to_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()


# ── API callers ───────────────────────────────────────────────────────────────

def _call_gemini(img: Image.Image, prompt: str) -> str:
    if not GEMINI_KEY:
        return "ERROR: GEMINI_API_KEY not set in .env"
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel("gemini-2.5-pro")
    response = model.generate_content([prompt, img])
    # .text raises if the response was blocked; go via candidates instead
    return response.candidates[0].content.parts[0].text


def _call_qwen(img: Image.Image, prompt: str) -> str:
    if not QWEN_KEY:
        return "ERROR: QWEN_API_KEY not set in .env"
    from openai import OpenAI
    client = OpenAI(
        api_key=QWEN_KEY,
        base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    )
    b64 = to_b64(img)
    resp = client.chat.completions.create(
        model="qwen-vl-max",
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            {"type": "text", "text": prompt},
        ]}],
        max_tokens=4096,
    )
    return resp.choices[0].message.content


def _call_mistral(img: Image.Image, prompt: str) -> str:
    if not MISTRAL_KEY:
        return "ERROR: MISTRAL_API_KEY not set in .env"
    from mistralai import Mistral
    client = Mistral(api_key=MISTRAL_KEY)
    b64 = to_b64(img)
    # Mistral SDK expects image_url as a plain string, not {"url": ...}
    resp = client.chat.complete(
        model="pixtral-large-latest",
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": f"data:image/jpeg;base64,{b64}"},
            {"type": "text", "text": prompt},
        ]}],
    )
    return resp.choices[0].message.content


# ── parallel runner ───────────────────────────────────────────────────────────

async def run_all(img: Image.Image, prompt: str) -> dict[str, str]:
    async def call(name, fn):
        try:
            return name, await asyncio.to_thread(fn, img, prompt)
        except Exception as exc:
            return name, f"ERROR: {exc}"

    tasks = [
        call("gemini",  _call_gemini),
        call("qwen",    _call_qwen),
        call("mistral", _call_mistral),
    ]
    return dict(await asyncio.gather(*tasks))


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Query three VLMs in parallel for text recognition.")
    parser.add_argument("image", help="Path to the image file")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="Custom prompt")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        sys.exit(f"File not found: {args.image}")

    img = load_image(args.image)
    results = asyncio.run(run_all(img, args.prompt))

    sep = "─" * 60
    for model, text in results.items():
        print(f"\n{sep}")
        print(f"  {model.upper()}")
        print(sep)
        print(text)
    print()


if __name__ == "__main__":
    main()
