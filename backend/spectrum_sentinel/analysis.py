from __future__ import annotations

import base64
from pathlib import Path

from .h5_reader import FRAME_LIMIT, read_h5_iq
from .models import run_inference
from .preprocessing import render_png, spectrogram
from .schemas import Detection


def analyse_h5(
    path: Path,
    *,
    model_path: Path | None,
    fft_size: int,
    hop_length: int,
    window: str,
    color_map: str,
    db_min: float,
    db_max: float,
    confidence: float,
    remove_dc: bool,
) -> dict:
    iq, metadata = read_h5_iq(
        path, fft_size=fft_size, hop_length=hop_length, frame_limit=FRAME_LIMIT
    )
    power = spectrogram(
        iq,
        fft_size=fft_size,
        hop_length=hop_length,
        window=window,
        remove_dc=remove_dc,
    )
    png, inference_image = render_png(power, color_map=color_map, db_min=db_min, db_max=db_max)
    raw_detections = (
        run_inference(model_path, inference_image, confidence) if model_path is not None else []
    )
    image_height, image_width = inference_image.shape[:2]
    frame_count = metadata.processed_frames
    frequency_low = metadata.frequency_low_hz
    frequency_span = metadata.frequency_high_hz - frequency_low
    duration = metadata.duration_s
    detections = []
    for index, raw in enumerate(raw_detections, start=1):
        x1, y1, x2, y2 = raw["xyxy"]
        x1, x2 = sorted((max(0.0, x1), min(float(image_width), x2)))
        y1, y2 = sorted((max(0.0, y1), min(float(image_height), y2)))
        normalised_x = x1 / image_width
        normalised_y = y1 / image_height
        normalised_width = max(0.0, x2 - x1) / image_width
        normalised_height = max(0.0, y2 - y1) / image_height
        freq_low = frequency_low + normalised_x * frequency_span
        freq_high = frequency_low + (normalised_x + normalised_width) * frequency_span
        frame_start = round(normalised_y * frame_count)
        frame_end = round((normalised_y + normalised_height) * frame_count)
        detection = Detection(
            id=index,
            class_id=raw["class_id"],
            class_name=raw["class_name"],
            confidence=raw["confidence"],
            x=normalised_x,
            y=normalised_y,
            width=normalised_width,
            height=normalised_height,
            frame_start=frame_start,
            frame_end=frame_end,
            time_start_s=normalised_y * duration,
            time_end_s=(normalised_y + normalised_height) * duration,
            frequency_low_hz=freq_low,
            frequency_high_hz=freq_high,
            center_frequency_hz=(freq_low + freq_high) / 2,
            bandwidth_hz=freq_high - freq_low,
        )
        detections.append(detection.to_dict())
    return {
        "file_name": path.name,
        "image": f"data:image/png;base64,{base64.b64encode(png).decode('ascii')}",
        "image_width": image_width,
        "image_height": image_height,
        "orientation": "vertical_time",
        "metadata": metadata.to_dict(),
        "detections": detections,
        "preprocessing": {
            "fft_size": fft_size,
            "hop_length": hop_length,
            "window": window,
            "color_map": color_map,
            "db_min": db_min,
            "db_max": db_max,
            "remove_dc": remove_dc,
            "frame_limit": FRAME_LIMIT,
        },
        "model": model_path.name if model_path else None,
    }
