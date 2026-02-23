# Spot Heal Image Cleaner

This project provides a **lawful spot-healing pipeline** for images:

- Inpaint only user-selected regions (mask or brush stroke coordinates).
- Keep the full frame workflow (no mandatory watermark-cropping behavior).
- Convert output to **16:9**.
- Compress output JPEG to a target size (default: **50 KB**).

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Usage

### Option A: Use a mask image

White pixels (`255`) in the mask are healed.

```bash
python spot_heal.py input.jpg output.jpg --mask mask.png --max-bytes 50000
```

### Option B: Use brush stroke coordinates

```bash
python spot_heal.py input.jpg output.jpg \
  --strokes-json '[{"x":100,"y":150,"radius":25},{"x":120,"y":155,"radius":15}]' \
  --max-bytes 50000
```

## Notes

- This is intended for legitimate image retouching (e.g., dust, scratches, unwanted objects you have rights to edit).
- Default inpainting method: OpenCV Telea (`cv2.INPAINT_TELEA`).
