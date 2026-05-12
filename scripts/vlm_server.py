"""
VLM Text Recognition — web server

Run:
    uvicorn scripts.vlm_server:app --host 0.0.0.0 --port 8000 --reload

Then open http://localhost:8000
"""

import asyncio
import base64
import io
import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
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

app = FastAPI()


# ── helpers ───────────────────────────────────────────────────────────────────

def bytes_to_pil(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGB")

def to_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()


# ── model callers (sync — run in thread pool) ─────────────────────────────────

def _call_gemini(img: Image.Image, prompt: str) -> str:
    if not GEMINI_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in .env")
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel("gemini-2.5-pro")
    response = model.generate_content([prompt, img])
    return response.candidates[0].content.parts[0].text


def _call_qwen(img: Image.Image, prompt: str) -> str:
    if not QWEN_KEY:
        raise RuntimeError("QWEN_API_KEY not set in .env")
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
        raise RuntimeError("MISTRAL_API_KEY not set in .env")
    from mistralai import Mistral
    client = Mistral(api_key=MISTRAL_KEY)
    b64 = to_b64(img)
    resp = client.chat.complete(
        model="pixtral-large-latest",
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": f"data:image/jpeg;base64,{b64}"},
            {"type": "text", "text": prompt},
        ]}],
    )
    return resp.choices[0].message.content


# ── SSE endpoint ──────────────────────────────────────────────────────────────

MODELS = [
    ("gemini",  _call_gemini),
    ("qwen",    _call_qwen),
    ("mistral", _call_mistral),
]

@app.post("/transcribe")
async def transcribe(image: UploadFile = File(...), prompt: str = Form(...)):
    img = bytes_to_pil(await image.read())

    async def stream():
        queue: asyncio.Queue = asyncio.Queue()

        async def run(name: str, fn):
            try:
                text = await asyncio.to_thread(fn, img, prompt)
                await queue.put({"model": name, "text": text})
            except Exception as exc:
                await queue.put({"model": name, "error": str(exc)})

        tasks = [asyncio.create_task(run(name, fn)) for name, fn in MODELS]

        for _ in tasks:
            item = await queue.get()
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


# ── frontend ──────────────────────────────────────────────────────────────────

HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VLM Text Recognition</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
      background: #f0f4f8; color: #1a2a3a; min-height: 100vh;
    }}
    header {{
      background: linear-gradient(135deg, #1a3a6b 0%, #2d5aa0 100%);
      color: white; padding: 22px 24px; text-align: center;
    }}
    header h1 {{ font-size: 1.5rem; font-weight: 800; }}
    header p  {{ margin-top: 4px; font-size: 0.9rem; opacity: 0.8; }}

    .container {{ max-width: 1400px; margin: 0 auto; padding: 24px 20px; }}

    .controls {{
      background: white; border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.07);
      padding: 22px; margin-bottom: 20px;
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
      align-items: end;
    }}
    @media (max-width: 700px) {{ .controls {{ grid-template-columns: 1fr; }} }}

    label {{ display: block; font-size: 0.82rem; font-weight: 600;
             color: #446; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }}

    .drop-zone {{
      border: 2px dashed #c0cfe0; border-radius: 10px;
      padding: 28px 16px; text-align: center; cursor: pointer;
      transition: border-color .2s, background .2s; position: relative;
    }}
    .drop-zone:hover, .drop-zone.over {{ border-color: #2d5aa0; background: #eef3fb; }}
    .drop-zone input {{ position: absolute; inset: 0; opacity: 0; cursor: pointer; }}
    .drop-zone .hint {{ font-size: 0.88rem; color: #778; margin-top: 4px; }}
    .drop-zone .filename {{ font-size: 0.88rem; color: #2d5aa0; font-weight: 600; margin-top: 6px; }}

    .prompt-wrap textarea {{
      width: 100%; border: 1.5px solid #c8d4e0; border-radius: 8px;
      padding: 10px 12px; font-size: 0.9rem; line-height: 1.5;
      resize: vertical; outline: none; font-family: inherit;
    }}
    .prompt-wrap textarea:focus {{ border-color: #2d5aa0; }}

    .run-row {{ text-align: center; margin-bottom: 20px; }}
    .run-btn {{
      background: #1a3a6b; color: white; border: none;
      border-radius: 9px; padding: 13px 44px;
      font-size: 1rem; font-weight: 700; cursor: pointer;
      transition: background .2s;
    }}
    .run-btn:hover {{ background: #2d5aa0; }}
    .run-btn:disabled {{ background: #aab; cursor: not-allowed; }}

    .results {{
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
    }}
    @media (max-width: 900px) {{ .results {{ grid-template-columns: 1fr; }} }}

    .model-card {{
      background: white; border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.07);
      display: flex; flex-direction: column; overflow: hidden;
    }}
    .model-header {{
      padding: 14px 18px; font-weight: 700; font-size: 0.95rem;
      display: flex; align-items: center; gap: 8px;
    }}
    .model-header.gemini  {{ background: #e8f0fe; color: #1a3a6b; }}
    .model-header.qwen    {{ background: #fff3e0; color: #7a3800; }}
    .model-header.mistral {{ background: #f3e8ff; color: #4a007a; }}

    .model-body {{
      flex: 1; padding: 16px;
      font-size: 0.88rem; line-height: 1.65;
      white-space: pre-wrap; word-break: break-word;
      min-height: 200px;
    }}
    .model-footer {{
      padding: 10px 16px; border-top: 1px solid #eef;
      display: flex; justify-content: flex-end;
    }}
    .copy-btn {{
      background: none; border: 1.5px solid #c0cfe0; border-radius: 6px;
      padding: 5px 14px; font-size: 0.8rem; cursor: pointer; color: #446;
    }}
    .copy-btn:hover {{ border-color: #2d5aa0; color: #2d5aa0; }}

    .spinner {{
      display: inline-block; width: 18px; height: 18px;
      border: 2.5px solid #dde; border-top-color: #2d5aa0;
      border-radius: 50%; animation: spin .8s linear infinite;
    }}
    @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
    .loading-msg {{ color: #889; font-style: italic; display: flex; align-items: center; gap: 10px; }}
    .error-msg {{ color: #c0392b; }}
  </style>
</head>
<body>

<header>
  <h1>VLM Text Recognition</h1>
  <p>Gemini 2.5 Pro · Qwen-VL-Max · Pixtral Large — queried in parallel</p>
</header>

<div class="container">
  <div class="controls">
    <div class="upload-wrap">
      <label>Image</label>
      <div class="drop-zone" id="drop-zone">
        <input type="file" id="file-input" accept="image/*">
        <div>📄 Drop an image here or click to browse</div>
        <div class="hint">JPEG, PNG, TIFF</div>
        <div class="filename" id="filename"></div>
      </div>
    </div>
    <div class="prompt-wrap">
      <label>Prompt</label>
      <textarea id="prompt" rows="5">{DEFAULT_PROMPT}</textarea>
    </div>
  </div>

  <div class="run-row">
    <button class="run-btn" id="run-btn" onclick="run()">Analyze</button>
  </div>

  <div class="results">
    <div class="model-card">
      <div class="model-header gemini">🔵 Gemini 2.5 Pro</div>
      <div class="model-body" id="out-gemini"></div>
      <div class="model-footer"><button class="copy-btn" onclick="copy('gemini')">Copy</button></div>
    </div>
    <div class="model-card">
      <div class="model-header qwen">🟠 Qwen-VL-Max</div>
      <div class="model-body" id="out-qwen"></div>
      <div class="model-footer"><button class="copy-btn" onclick="copy('qwen')">Copy</button></div>
    </div>
    <div class="model-card">
      <div class="model-header mistral">🟣 Pixtral Large</div>
      <div class="model-body" id="out-mistral"></div>
      <div class="model-footer"><button class="copy-btn" onclick="copy('mistral')">Copy</button></div>
    </div>
  </div>
</div>

<script>
  const fileInput = document.getElementById('file-input');
  const dropZone  = document.getElementById('drop-zone');
  const filename  = document.getElementById('filename');
  const runBtn    = document.getElementById('run-btn');

  fileInput.addEventListener('change', () => {{
    filename.textContent = fileInput.files[0]?.name ?? '';
  }});
  dropZone.addEventListener('dragover',  e => {{ e.preventDefault(); dropZone.classList.add('over'); }});
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
  dropZone.addEventListener('drop', e => {{
    e.preventDefault(); dropZone.classList.remove('over');
    fileInput.files = e.dataTransfer.files;
    filename.textContent = fileInput.files[0]?.name ?? '';
  }});

  const outputs = {{}};

  function setLoading(model) {{
    const el = document.getElementById('out-' + model);
    el.innerHTML = '<span class="loading-msg"><span class="spinner"></span> Querying…</span>';
    outputs[model] = '';
  }}

  function setResult(model, text) {{
    const el = document.getElementById('out-' + model);
    el.textContent = text;
    outputs[model] = text;
  }}

  function setError(model, msg) {{
    const el = document.getElementById('out-' + model);
    el.innerHTML = '<span class="error-msg">⚠ ' + msg + '</span>';
    outputs[model] = '';
  }}

  function copy(model) {{
    if (outputs[model]) navigator.clipboard.writeText(outputs[model]);
  }}

  async function run() {{
    const file = fileInput.files[0];
    if (!file) {{ alert('Please select an image first.'); return; }}

    runBtn.disabled = true;
    ['gemini', 'qwen', 'mistral'].forEach(setLoading);

    const form = new FormData();
    form.append('image', file);
    form.append('prompt', document.getElementById('prompt').value);

    try {{
      const resp = await fetch('/transcribe', {{ method: 'POST', body: form }});
      if (!resp.ok) throw new Error('Server error ' + resp.status);

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = '';

      while (true) {{
        const {{ done, value }} = await reader.read();
        if (done) break;
        buf += decoder.decode(value, {{ stream: true }});
        const parts = buf.split('\\n\\n');
        buf = parts.pop();               // keep incomplete chunk
        for (const part of parts) {{
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          const d = JSON.parse(line.slice(6));
          if (d.error) setError(d.model, d.error);
          else         setResult(d.model, d.text);
        }}
      }}
    }} catch (err) {{
      ['gemini', 'qwen', 'mistral'].forEach(m => setError(m, err.message));
    }} finally {{
      runBtn.disabled = false;
    }}
  }}
</script>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse)
async def index():
    return HTML
