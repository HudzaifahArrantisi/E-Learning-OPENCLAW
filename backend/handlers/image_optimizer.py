#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import sys


def optimize_image(input_path: str, output_path: str, mime_type: str, ext: str, max_width: int, quality: int):
    try:
        from PIL import Image
    except Exception:
        shutil.copyfile(input_path, output_path)
        return False, mime_type, ext

    try:
        with Image.open(input_path) as img:
            img.load()
            width, height = img.size
            if max_width > 0 and width > max_width:
                new_height = int((height * max_width) / width)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            ext_lower = (ext or "").lower()
            if ext_lower in [".jpg", ".jpeg"]:
                if img.mode not in ("RGB", "L"):
                    img = img.convert("RGB")
                img.save(output_path, format="JPEG", quality=quality, optimize=True)
                return True, "image/jpeg", ".jpg"

            if ext_lower == ".png":
                if img.mode not in ("RGB", "RGBA", "L"):
                    img = img.convert("RGBA")
                img.save(output_path, format="PNG", optimize=True, compress_level=9)
                return True, "image/png", ".png"

            if ext_lower == ".webp":
                img.save(output_path, format="WEBP", quality=quality, method=6)
                return True, "image/webp", ".webp"

            if ext_lower == ".gif":
                img.save(output_path, format="GIF", optimize=True)
                return True, "image/gif", ".gif"

            # Fallback: convert unknown image extension to JPEG
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            img.save(output_path, format="JPEG", quality=quality, optimize=True)
            return True, "image/jpeg", ".jpg"
    except Exception:
        shutil.copyfile(input_path, output_path)
        return False, mime_type, ext


def optimize_pdf(input_path: str, output_path: str, mime_type: str, ext: str):
    # Try pikepdf first (best result), fallback to pypdf, else passthrough.
    try:
        import pikepdf

        with pikepdf.open(input_path) as pdf:
            pdf.save(
                output_path,
                compress_streams=True,
                object_stream_mode=pikepdf.ObjectStreamMode.generate,
                linearize=True,
            )
        return True, "application/pdf", ".pdf"
    except Exception:
        pass

    try:
        from pypdf import PdfReader, PdfWriter

        reader = PdfReader(input_path)
        writer = PdfWriter()
        for page in reader.pages:
            try:
                page.compress_content_streams()
            except Exception:
                pass
            writer.add_page(page)

        with open(output_path, "wb") as f:
            writer.write(f)
        return True, "application/pdf", ".pdf"
    except Exception:
        shutil.copyfile(input_path, output_path)
        return False, mime_type, ext


def main():
    parser = argparse.ArgumentParser(description="Optimize upload file")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--mime", required=True)
    parser.add_argument("--ext", required=True)
    parser.add_argument("--max-width", type=int, default=1200)
    parser.add_argument("--quality", type=int, default=75)
    args = parser.parse_args()

    mime_type = (args.mime or "").lower().strip()
    ext = (args.ext or "").lower().strip()
    if ext and not ext.startswith("."):
        ext = "." + ext

    if not os.path.isfile(args.input):
        print(json.dumps({"success": False, "error": "input file not found"}))
        return 1

    changed = False
    result_mime = mime_type
    result_ext = ext

    if mime_type.startswith("image/"):
        changed, result_mime, result_ext = optimize_image(
            args.input, args.output, mime_type, ext, args.max_width, args.quality
        )
    elif mime_type == "application/pdf":
        changed, result_mime, result_ext = optimize_pdf(args.input, args.output, mime_type, ext)
    else:
        shutil.copyfile(args.input, args.output)
        changed = False

    print(
        json.dumps(
            {
                "success": True,
                "changed": bool(changed),
                "mime_type": result_mime,
                "extension": result_ext,
            }
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
