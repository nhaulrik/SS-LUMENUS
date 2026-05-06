"""
bundle-presentation.py
Packages a multi-file Solon presentation into a single self-contained HTML file.

Usage:
  python bundle-presentation.py <presentation-folder> [output.html]

If output path is omitted, writes <presentation-folder-name>-bundled.html
next to the presentation folder.
"""

import json
import os
import sys


def bundle(base: str, out_path: str | None = None):
    slides_dir = os.path.join(base, "slides")
    index_path = os.path.join(base, "index.html")

    if not os.path.isfile(index_path):
        raise FileNotFoundError(f"index.html not found in {base}")
    if not os.path.isdir(slides_dir):
        raise FileNotFoundError(f"slides/ directory not found in {base}")

    with open(index_path, "r", encoding="utf-8") as f:
        index_html = f.read()

    slides: dict[str, str] = {}
    for fname in sorted(os.listdir(slides_dir)):
        if fname.endswith(".html"):
            sid = fname[:-5]
            with open(os.path.join(slides_dir, fname), "r", encoding="utf-8") as f:
                slides[sid] = f.read()

    print(f"Loaded {len(slides)} slides from {slides_dir}")

    def safe_js_string(s: str) -> str:
        # json.dumps gives a valid JSON string, but the browser HTML parser will
        # still terminate the <script> block if it sees </script> or </Script> etc.
        # Escaping the slash as \/ is valid JSON and hides it from the HTML parser.
        encoded = json.dumps(s)
        return encoded.replace("</", "<\\/")

    slide_map_parts = [
        f"  {json.dumps(sid)}: {safe_js_string(html)}" for sid, html in slides.items()
    ]
    slide_map_js = "var __SLIDES__ = {\n" + ",\n".join(slide_map_parts) + "\n};"

    # Replace iframe file-load with srcdoc injection
    patched = index_html.replace(
        "frame.src = 'slides/' + id + '.html';",
        "frame.srcdoc = __SLIDES__[id] || '<!-- slide not found: ' + id + ' -->';",
    )

    # Inject the slide map right before the IIFE in the last <script>
    inject_marker = "(function () {"
    inject_pos = patched.rfind(inject_marker)
    if inject_pos == -1:
        raise ValueError("Could not find '(function () {' marker in index.html")

    patched = patched[:inject_pos] + slide_map_js + "\n\n" + patched[inject_pos:]

    if out_path is None:
        folder_name = os.path.basename(os.path.normpath(base))
        out_path = os.path.join(
            os.path.dirname(os.path.normpath(base)),
            folder_name + "-bundled.html",
        )

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(patched)

    size_mb = os.path.getsize(out_path) / 1024 / 1024
    print(f"Written: {out_path}  ({size_mb:.2f} MB)")
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    presentation_dir = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    bundle(presentation_dir, output_file)
