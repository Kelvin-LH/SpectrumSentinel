from __future__ import annotations

import os
from pathlib import Path

import yaml

DEFAULT_FFT_SIZE = 1024
DEFAULT_HOP_LENGTH = 256
DEFAULT_WINDOW = "hann"
FRAME_LIMIT = 2000


def _config_path() -> Path | None:
    configured = os.getenv("SPECTRUM_SENTINEL_TRAINING_CONFIG")
    if configured:
        path = Path(configured)
        return path if path.is_file() else None
    return None


def load_training_config() -> dict:
    path = _config_path()
    values = {}
    if path:
        try:
            values = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        except (OSError, yaml.YAMLError):
            values = {}
    imgsz = values.get("imgsz", 640)
    if isinstance(imgsz, list):
        imgsz = imgsz[0]
    return {
        "fft_size": int(values.get("fft_size", DEFAULT_FFT_SIZE)),
        "hop_length": int(values.get("hop_length", DEFAULT_HOP_LENGTH)),
        "window": str(values.get("window", DEFAULT_WINDOW)),
        "frame_limit": FRAME_LIMIT,
        "imgsz": int(imgsz),
        "model": str(values.get("model", "")),
        "source": str(path) if path else "内置训练预处理配置",
    }

