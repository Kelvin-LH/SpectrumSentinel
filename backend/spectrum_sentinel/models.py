from __future__ import annotations

import shutil
from functools import lru_cache
from pathlib import Path

SUPPORTED_MODEL_SUFFIXES = {".pt", ".onnx", ".engine", ".torchscript"}


def scan_models(model_dir: Path) -> list[dict]:
    model_dir.mkdir(parents=True, exist_ok=True)
    models = []
    for path in sorted(model_dir.iterdir(), key=lambda item: item.name.lower()):
        if path.is_file() and path.suffix.lower() in SUPPORTED_MODEL_SUFFIXES:
            models.append(
                {
                    "id": path.name,
                    "name": path.stem,
                    "format": path.suffix.lower().lstrip("."),
                    "size_bytes": path.stat().st_size,
                }
            )
    return models


def store_model(source: Path, model_dir: Path, original_name: str) -> Path:
    suffix = Path(original_name).suffix.lower()
    if suffix not in SUPPORTED_MODEL_SUFFIXES:
        raise ValueError("模型格式不支持，仅接受 PT、ONNX、Engine 或 TorchScript")
    safe_name = Path(original_name).name
    destination = model_dir / safe_name
    if source.resolve() != destination.resolve():
        shutil.copyfile(source, destination)
    clear_model_cache()
    return destination


@lru_cache(maxsize=4)
def _load_model(path_text: str):
    from ultralytics import RTDETR, YOLO

    path = Path(path_text)
    if "rtdetr" in path.name.lower():
        return RTDETR(str(path))
    try:
        return YOLO(str(path))
    except (KeyError, NotImplementedError, RuntimeError, TypeError, ValueError):
        # Incremental training normally exports a generic best.pt name.  If it
        # contains an RT-DETR graph, fall back without requiring the user to
        # rename the file.
        return RTDETR(str(path))


def clear_model_cache() -> None:
    _load_model.cache_clear()


def run_inference(model_path: Path, image, confidence: float):
    model = _load_model(str(model_path.resolve()))
    result = model.predict(source=image, conf=confidence, verbose=False)[0]
    names = result.names
    detections = []
    if result.boxes is None:
        return detections
    for box in result.boxes:
        class_id = int(box.cls.item())
        detections.append(
            {
                "class_id": class_id,
                "class_name": str(names.get(class_id, class_id)),
                "confidence": float(box.conf.item()),
                "xyxy": [float(value) for value in box.xyxy[0].tolist()],
            }
        )
    return detections
