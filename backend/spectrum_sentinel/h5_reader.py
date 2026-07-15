from __future__ import annotations

import json
import re
from collections.abc import Callable
from pathlib import Path
from typing import Any

import h5py
import numpy as np

from .schemas import SignalMetadata

FRAME_LIMIT = 2000

_META_ALIASES = {
    "sample_rate_hz": (
        "samplerate",
        "sample_rate",
        "sample_rate_hz",
        "samplingrate",
        "sampling_rate",
    ),
    "center_frequency_hz": (
        "centerfreq",
        "center_freq",
        "center_frequency",
        "center_frequency_hz",
        "frequency",
    ),
    "bandwidth_hz": ("bandwidth", "bandwidth_hz", "span", "frequency_span"),
    "start_time": (
        "starttime",
        "start_time",
        "timestamp",
        "acquisition_time",
        "recording_time",
    ),
}


def _normalise_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _plain(value: Any) -> Any:
    if isinstance(value, np.ndarray) and value.size == 1:
        value = value.reshape(-1)[0]
    if isinstance(value, (bytes, np.bytes_)):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, np.generic):
        return value.item()
    return value


def _collect_metadata(handle: h5py.File) -> dict[str, Any]:
    values: dict[str, Any] = {}

    def capture(key: str, value: Any) -> None:
        normalised = _normalise_key(key.split("/")[-1])
        value = _plain(value)
        for field, aliases in _META_ALIASES.items():
            if normalised in {_normalise_key(alias) for alias in aliases}:
                values.setdefault(field, value)

    for key, value in handle.attrs.items():
        capture(key, value)

    def visitor(name: str, obj: h5py.Group | h5py.Dataset) -> None:
        for key, value in obj.attrs.items():
            capture(key, value)
        if isinstance(obj, h5py.Dataset) and obj.size == 1:
            try:
                capture(name, obj[()])
            except (OSError, TypeError, ValueError):
                pass
        if isinstance(obj, h5py.Dataset) and name.endswith("hub_metadata_json"):
            try:
                payload = json.loads(str(_plain(obj[()])))
                if isinstance(payload, dict):
                    for key, value in payload.items():
                        capture(key, value)
            except (json.JSONDecodeError, OSError, TypeError, ValueError):
                pass

    handle.visititems(visitor)
    return values


def _complex_reader(dataset: h5py.Dataset) -> Callable[[int], np.ndarray] | None:
    dtype = dataset.dtype
    shape = dataset.shape
    if not shape:
        return None
    if np.issubdtype(dtype, np.complexfloating):
        return lambda count: np.asarray(dataset[:count], dtype=np.complex64).reshape(-1)
    if dtype.fields:
        names = list(dtype.fields)
        lowered = {name.lower(): name for name in names}
        real_name = next((lowered[key] for key in ("real", "re", "i") if key in lowered), None)
        imag_name = next((lowered[key] for key in ("imag", "im", "q") if key in lowered), None)
        if real_name and imag_name:

            def read_compound(count: int) -> np.ndarray:
                chunk = dataset[:count]
                return np.asarray(chunk[real_name], dtype=np.float32).reshape(-1) + 1j * np.asarray(
                    chunk[imag_name], dtype=np.float32
                ).reshape(-1)

            return read_compound
    if len(shape) == 2 and shape[-1] == 2 and np.issubdtype(dtype, np.number):

        def read_columns(count: int) -> np.ndarray:
            chunk = np.asarray(dataset[:count], dtype=np.float32)
            return chunk[:, 0] + 1j * chunk[:, 1]

        return read_columns
    if len(shape) == 1 and np.issubdtype(dtype, np.floating) and shape[0] >= 2:

        def read_interleaved(count: int) -> np.ndarray:
            chunk = np.asarray(dataset[: count * 2], dtype=np.float32)
            usable = chunk.size - chunk.size % 2
            return chunk[:usable:2] + 1j * chunk[1:usable:2]

        return read_interleaved
    return None


def _find_iq_source(handle: h5py.File) -> tuple[str, int, Callable[[int], np.ndarray]]:
    candidates: list[tuple[int, str, int, Callable[[int], np.ndarray]]] = []

    def visitor(name: str, obj: h5py.Group | h5py.Dataset) -> None:
        if not isinstance(obj, h5py.Dataset):
            return
        reader = _complex_reader(obj)
        if reader is None:
            return
        count = int(obj.shape[0])
        if len(obj.shape) == 1 and np.issubdtype(obj.dtype, np.floating):
            count //= 2
        label = name.lower()
        score = 10 if any(token in label for token in ("iq", "samples", "waveform")) else 0
        score += min(count // 100_000, 5)
        candidates.append((score, name, count, reader))

    handle.visititems(visitor)
    if not candidates:
        raise ValueError("未找到可识别的 IQ 数据集（支持复数、I/Q 双列或交织浮点格式）")
    _, name, count, reader = max(candidates, key=lambda item: (item[0], item[2]))
    return name, count, reader


def read_h5_iq(
    path: str | Path,
    *,
    fft_size: int,
    hop_length: int,
    frame_limit: int = FRAME_LIMIT,
) -> tuple[np.ndarray, SignalMetadata]:
    required_samples = fft_size + max(0, frame_limit - 1) * hop_length
    with h5py.File(path, "r") as handle:
        raw_meta = _collect_metadata(handle)
        dataset_name, source_count, reader = _find_iq_source(handle)
        iq = reader(min(source_count, required_samples))

    iq = np.asarray(iq, dtype=np.complex64).reshape(-1)
    if iq.size < fft_size:
        raise ValueError(f"IQ 样本不足：至少需要 {fft_size} 点，实际为 {iq.size} 点")
    frame_count = min(frame_limit, 1 + (iq.size - fft_size) // hop_length)
    processed_samples = fft_size + max(0, frame_count - 1) * hop_length
    iq = iq[:processed_samples]
    sample_rate = float(raw_meta.get("sample_rate_hz") or 0.0)
    center_frequency = float(raw_meta.get("center_frequency_hz") or 0.0)
    bandwidth = float(raw_meta.get("bandwidth_hz") or sample_rate)
    metadata = SignalMetadata(
        sample_rate_hz=sample_rate,
        center_frequency_hz=center_frequency,
        bandwidth_hz=bandwidth,
        start_time=str(raw_meta["start_time"]) if raw_meta.get("start_time") else None,
        source_dataset=f"/{dataset_name}",
        source_samples=source_count,
        processed_samples=processed_samples,
        processed_frames=frame_count,
        frame_limit=frame_limit,
    )
    return iq, metadata
