from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image

COLORMAPS: dict[str, list[tuple[float, str]]] = {
    "ocean": [
        (0, "#020817"),
        (0.32, "#06355f"),
        (0.58, "#087f8c"),
        (0.8, "#57e3c3"),
        (1, "#f0c94c"),
    ],
    "viridis": [
        (0, "#440154"),
        (0.25, "#3b528b"),
        (0.5, "#21918c"),
        (0.75, "#5ec962"),
        (1, "#fde725"),
    ],
    "turbo": [
        (0, "#30123b"),
        (0.25, "#466be3"),
        (0.5, "#1ae4b6"),
        (0.75, "#f9e721"),
        (1, "#7a0403"),
    ],
    "gray": [(0, "#000000"), (1, "#ffffff")],
}


def _window(name: str, size: int) -> np.ndarray:
    if name == "hamming":
        return np.hamming(size).astype(np.float32)
    if name == "blackman":
        return np.blackman(size).astype(np.float32)
    return np.hanning(size).astype(np.float32)


def spectrogram(
    iq: np.ndarray,
    *,
    fft_size: int,
    hop_length: int,
    window: str = "hann",
    remove_dc: bool = True,
) -> np.ndarray:
    frame_count = 1 + (iq.size - fft_size) // hop_length
    shape = (frame_count, fft_size)
    strides = (iq.strides[0] * hop_length, iq.strides[0])
    frames = np.lib.stride_tricks.as_strided(iq, shape=shape, strides=strides, writeable=False)
    frames = frames * _window(window, fft_size)[None, :]
    spectrum = np.fft.fftshift(np.fft.fft(frames, axis=1), axes=1)
    power = 20 * np.log10(np.abs(spectrum) / max(1, fft_size) + 1e-12)
    if remove_dc and power.shape[1] > 2:
        middle = power.shape[1] // 2
        power[:, middle] = (power[:, middle - 1] + power[:, middle + 1]) / 2
    return power.astype(np.float32)


def _hex_rgb(value: str) -> np.ndarray:
    value = value.lstrip("#")
    return np.array([int(value[index : index + 2], 16) for index in (0, 2, 4)], dtype=np.float32)


def colorize(power: np.ndarray, *, color_map: str, db_min: float, db_max: float) -> np.ndarray:
    normalised = np.clip((power - db_min) / max(db_max - db_min, 1e-6), 0, 1)
    stops = COLORMAPS.get(color_map, COLORMAPS["ocean"])
    result = np.zeros((*normalised.shape, 3), dtype=np.float32)
    for (left_pos, left_hex), (right_pos, right_hex) in zip(stops, stops[1:], strict=False):
        mask = (normalised >= left_pos) & (normalised <= right_pos)
        amount = np.clip((normalised - left_pos) / max(right_pos - left_pos, 1e-6), 0, 1)
        left = _hex_rgb(left_hex)
        right = _hex_rgb(right_hex)
        result[mask] = left + (right - left) * amount[mask, None]
    return np.asarray(result, dtype=np.uint8)


def render_png(
    power: np.ndarray,
    *,
    color_map: str,
    db_min: float,
    db_max: float,
    width: int = 1200,
    height: int = 760,
) -> tuple[bytes, np.ndarray]:
    # power is [time, frequency], so the exported waterfall is vertical by design.
    rgb = colorize(power, color_map=color_map, db_min=db_min, db_max=db_max)
    image = Image.fromarray(rgb).resize((width, height), Image.Resampling.BILINEAR)
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue(), np.asarray(image)
