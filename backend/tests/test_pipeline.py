from __future__ import annotations

from pathlib import Path

import h5py
import numpy as np
from fastapi.testclient import TestClient
from spectrum_sentinel.analysis import analyse_h5
from spectrum_sentinel.app import app
from spectrum_sentinel.h5_reader import read_h5_iq


def make_h5(path: Path, sample_count: int = 80_000) -> None:
    t = np.arange(sample_count, dtype=np.float32)
    iq = np.exp(2j * np.pi * 0.12 * t).astype(np.complex64)
    with h5py.File(path, "w") as handle:
        dataset = handle.create_dataset("iq/samples", data=iq)
        dataset.attrs["sample_rate_hz"] = 20_000_000.0
        handle.attrs["center_frequency_hz"] = 104_000_000.0
        handle.attrs["bandwidth_hz"] = 10_000_000.0
        handle.attrs["start_time"] = "2026-07-16T10:00:00Z"


def test_h5_reader_caps_frames_at_2000(tmp_path: Path) -> None:
    path = tmp_path / "signal.h5"
    make_h5(path, 700_000)
    iq, metadata = read_h5_iq(path, fft_size=1024, hop_length=256)
    assert metadata.processed_frames == 2000
    assert metadata.processed_samples == 1024 + 1999 * 256
    assert iq.size == metadata.processed_samples
    assert metadata.source_dataset == "/iq/samples"


def test_analysis_is_vertical_and_preserves_metadata(tmp_path: Path) -> None:
    path = tmp_path / "signal.h5"
    make_h5(path)
    result = analyse_h5(
        path,
        model_path=None,
        fft_size=512,
        hop_length=128,
        window="hann",
        color_map="ocean",
        db_min=-100,
        db_max=-20,
        confidence=0.25,
        remove_dc=True,
    )
    assert result["orientation"] == "vertical_time"
    assert result["image_width"] == 1200
    assert result["image_height"] == 760
    assert result["metadata"]["center_frequency_hz"] == 104_000_000.0
    assert result["detections"] == []
    assert result["image"].startswith("data:image/png;base64,")


def test_analyze_api_accepts_h5_and_reports_vertical_coordinates(tmp_path: Path) -> None:
    path = tmp_path / "api-signal.h5"
    make_h5(path)
    with path.open("rb") as source:
        response = TestClient(app).post(
            "/api/analyze",
            files={"file": (path.name, source, "application/x-hdf5")},
            data={"fft_size": "512", "hop_length": "128", "color_map": "ocean"},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["file_name"] == "api-signal.h5"
    assert payload["orientation"] == "vertical_time"
    assert payload["metadata"]["frame_limit"] == 2000
