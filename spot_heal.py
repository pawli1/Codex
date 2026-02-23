from __future__ import annotations

import argparse
import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence

from PIL import Image


@dataclass
class BrushStroke:
    x: int
    y: int
    radius: int


def _cv2():
    import cv2

    return cv2


def _np():
    import numpy as np

    return np


def load_image(path: Path) -> Any:
    cv2 = _cv2()
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Unable to load image: {path}")
    return image


def parse_strokes(strokes_raw: str) -> list[BrushStroke]:
    data = json.loads(strokes_raw)
    if not isinstance(data, list):
        raise ValueError("Strokes JSON must be a list.")

    strokes: list[BrushStroke] = []
    for item in data:
        strokes.append(
            BrushStroke(
                x=int(item["x"]),
                y=int(item["y"]),
                radius=max(1, int(item.get("radius", 15))),
            )
        )
    return strokes


def create_mask_from_strokes(shape: Sequence[int], strokes: Iterable[BrushStroke]) -> Any:
    cv2 = _cv2()
    np = _np()

    h, w = shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    for stroke in strokes:
        cv2.circle(mask, (stroke.x, stroke.y), stroke.radius, 255, thickness=-1)
    return mask


def inpaint_image(image: Any, mask: Any, radius: int = 5) -> Any:
    cv2 = _cv2()
    return cv2.inpaint(image, mask, radius, cv2.INPAINT_TELEA)


def center_crop_to_aspect(pil_image: Image.Image, width_ratio: int = 16, height_ratio: int = 9) -> Image.Image:
    target_aspect = width_ratio / height_ratio
    width, height = pil_image.size
    current_aspect = width / height

    if current_aspect > target_aspect:
        new_width = int(height * target_aspect)
        left = (width - new_width) // 2
        box = (left, 0, left + new_width, height)
    else:
        new_height = int(width / target_aspect)
        top = (height - new_height) // 2
        box = (0, top, width, top + new_height)

    return pil_image.crop(box)


def compress_to_max_size(pil_image: Image.Image, max_bytes: int, min_quality: int = 20) -> bytes:
    quality = 95
    best: bytes | None = None

    while quality >= min_quality:
        buffer = io.BytesIO()
        pil_image.save(buffer, format="JPEG", optimize=True, quality=quality)
        data = buffer.getvalue()

        if len(data) <= max_bytes:
            return data

        best = data
        quality -= 5

    if best is None:
        raise RuntimeError("Failed to encode output image.")

    return best


def run_pipeline(
    input_path: Path,
    output_path: Path,
    mask_path: Path | None,
    strokes_json: str | None,
    inpaint_radius: int,
    max_bytes: int,
) -> None:
    cv2 = _cv2()

    image = load_image(input_path)

    if mask_path:
        mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
        if mask is None:
            raise ValueError(f"Unable to load mask: {mask_path}")
        if mask.shape[:2] != image.shape[:2]:
            raise ValueError("Mask dimensions must match input image dimensions.")
    elif strokes_json:
        strokes = parse_strokes(strokes_json)
        mask = create_mask_from_strokes(image.shape, strokes)
    else:
        raise ValueError("Provide either --mask or --strokes-json.")

    cleaned = inpaint_image(image, mask, inpaint_radius)
    cleaned_rgb = cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(cleaned_rgb)

    cropped = center_crop_to_aspect(pil_image, 16, 9)
    compressed = compress_to_max_size(cropped, max_bytes=max_bytes)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(compressed)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Spot-heal selected image regions via inpainting, then export as 16:9 JPEG "
            "under a target byte size."
        )
    )
    parser.add_argument("input", type=Path, help="Input image path")
    parser.add_argument("output", type=Path, help="Output image path")
    parser.add_argument("--mask", type=Path, help="Grayscale mask image path (white = heal)")
    parser.add_argument(
        "--strokes-json",
        help='Inline JSON brush strokes, e.g. "[{\"x\":100,\"y\":200,\"radius\":20}]"',
    )
    parser.add_argument("--inpaint-radius", type=int, default=5)
    parser.add_argument("--max-bytes", type=int, default=50_000)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    run_pipeline(
        input_path=args.input,
        output_path=args.output,
        mask_path=args.mask,
        strokes_json=args.strokes_json,
        inpaint_radius=args.inpaint_radius,
        max_bytes=args.max_bytes,
    )


if __name__ == "__main__":
    main()
