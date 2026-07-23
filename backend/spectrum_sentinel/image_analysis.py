from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from .models import run_inference


def analyse_image(path: Path, *, model_path: Path, confidence: float) -> dict:
    with Image.open(path) as image:
        rgb = image.convert("RGB")
        width, height = rgb.size
        detections = run_inference(model_path, np.asarray(rgb), confidence)
    predictions = [
        {
            "class_id": item["class_id"],
            "class_name": item["class_name"],
            "confidence": item["confidence"],
        }
        for item in detections
    ]
    return {
        "file_name": path.name,
        "input_type": "image",
        "image_width": width,
        "image_height": height,
        "model": model_path.name,
        "predictions": predictions,
    }

