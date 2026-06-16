"""Process the brand logo from a single master source.

Inputs:
  public/brand/logo-source.jpg   master file (JPEG, black background)

Outputs:
  public/brand/logo-full.png     full wordmark + train mark (transparent PNG)
  public/brand/logo-icon.png     train-mark only, cropped from the same master

Strategy:
  We "screen-out" the black background. Per-pixel alpha is derived from
  luminance with a smooth ramp:
    - lum <= 6   → fully transparent  (pure black background)
    - lum >= 24  → fully opaque        (logo body, text, glow)
  In between we ramp linearly to keep the glow edges soft (anti-aliased).
  Then we unpremultiply the color so the logo retains its original hue on
  light surfaces (we assume composite = color * alpha because background
  was pure black, so original = composite / alpha).
  Finally we tightly crop to the non-transparent bounding box to remove
  the wide black margins, keeping a small breathing room.

For the icon we crop the left ~44 % of the source first (everything to the
left of the wordmark) and then run the same transparency pipeline, so the
icon and the wordmark are drawn from a single visually consistent master.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image


def _screen_out_black(rgb_img: Image.Image, out_path: Path, pad: int = 8) -> None:
    arr = np.array(rgb_img.convert("RGB")).astype(np.float32)

    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    luminance = 0.299 * r + 0.587 * g + 0.114 * b

    alpha_norm = np.clip((luminance - 6.0) / 18.0, 0.0, 1.0)

    safe = np.maximum(alpha_norm, 1e-3)
    out_r = np.clip(r / safe, 0, 255)
    out_g = np.clip(g / safe, 0, 255)
    out_b = np.clip(b / safe, 0, 255)
    out_a = alpha_norm * 255.0

    rgba = np.stack([out_r, out_g, out_b, out_a], axis=-1).astype(np.uint8)
    rgba_img = Image.fromarray(rgba, mode="RGBA")

    bbox = rgba_img.getbbox()
    if bbox is not None:
        left, top, right, bottom = bbox
        left = max(0, left - pad)
        top = max(0, top - pad)
        right = min(rgba_img.width, right + pad)
        bottom = min(rgba_img.height, bottom + pad)
        rgba_img = rgba_img.crop((left, top, right, bottom))

    rgba_img.save(out_path, format="PNG", optimize=True)
    print(f"wrote {out_path} ({rgba_img.size})")


def main() -> int:
    root = Path("public/brand")
    source = root / "logo-source.jpg"
    if not source.exists():
        print(f"missing master: {source}", file=sys.stderr)
        return 1

    master = Image.open(source).convert("RGB")
    w, _ = master.size

    # Full wordmark — entire master.
    _screen_out_black(master, root / "logo-full.png")

    # Train-only icon — keep the left fraction of the master.
    # The wordmark "L" of LOKFÜHRER starts at ~ 44 % horizontally; we cut
    # slightly before that so the rail outline stays intact and no letter
    # fragments leak into the icon.
    x_frac = 0.435
    icon_master = master.crop((0, 0, int(w * x_frac), master.height))
    _screen_out_black(icon_master, root / "logo-icon.png")

    return 0


if __name__ == "__main__":
    sys.exit(main())
