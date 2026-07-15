from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .analysis import analyse_h5
from .models import SUPPORTED_MODEL_SUFFIXES, scan_models, store_model
from .preprocessing import COLORMAPS

ROOT_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = Path(os.getenv("SPECTRUM_SENTINEL_MODEL_DIR", ROOT_DIR / "models"))
STATIC_DIR = ROOT_DIR / "backend" / "static"

app = FastAPI(title="谱鉴 Spectrum Sentinel", version=__version__)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "name": "谱鉴 Spectrum Sentinel", "version": __version__}


@app.get("/api/models")
def models() -> dict:
    return {"models": scan_models(MODEL_DIR), "supported": sorted(SUPPORTED_MODEL_SUFFIXES)}


@app.post("/api/models")
def upload_model(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_MODEL_SUFFIXES:
        raise HTTPException(status_code=400, detail="模型格式不支持")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
        shutil.copyfileobj(file.file, temporary)
        temporary_path = Path(temporary.name)
    try:
        destination = store_model(temporary_path, MODEL_DIR, file.filename or f"model{suffix}")
        return {"stored": destination.name, "models": scan_models(MODEL_DIR)}
    finally:
        temporary_path.unlink(missing_ok=True)


@app.post("/api/analyze")
def analyze(
    file: UploadFile = File(...),
    model: str = Form(""),
    fft_size: int = Form(1024),
    hop_length: int = Form(256),
    window: str = Form("hann"),
    color_map: str = Form("ocean"),
    db_min: float = Form(-100.0),
    db_max: float = Form(-20.0),
    confidence: float = Form(0.25),
    remove_dc: bool = Form(True),
) -> dict:
    filename = file.filename or "sample.h5"
    if Path(filename).suffix.lower() not in {".h5", ".hdf5"}:
        raise HTTPException(status_code=400, detail="仅支持 H5/HDF5 文件")
    if fft_size not in {256, 512, 1024, 2048, 4096}:
        raise HTTPException(status_code=400, detail="FFT 点数不支持")
    if hop_length <= 0 or hop_length > fft_size:
        raise HTTPException(status_code=400, detail="步长必须大于 0 且不超过 FFT 点数")
    if window not in {"hann", "hamming", "blackman"}:
        raise HTTPException(status_code=400, detail="窗函数不支持")
    if color_map not in COLORMAPS:
        raise HTTPException(status_code=400, detail="色图不支持")
    if not db_min < db_max:
        raise HTTPException(status_code=400, detail="动态范围下限必须小于上限")
    if not 0.01 <= confidence <= 0.99:
        raise HTTPException(status_code=400, detail="置信度阈值范围为 0.01–0.99")

    model_path = None
    if model:
        candidate = (MODEL_DIR / Path(model).name).resolve()
        if candidate.parent != MODEL_DIR.resolve() or not candidate.is_file():
            raise HTTPException(status_code=404, detail="所选模型不存在")
        model_path = candidate

    with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix, delete=False) as temporary:
        shutil.copyfileobj(file.file, temporary)
        temporary_path = Path(temporary.name)
    try:
        return analyse_h5(
            temporary_path,
            model_path=model_path,
            fft_size=fft_size,
            hop_length=hop_length,
            window=window,
            color_map=color_map,
            db_min=db_min,
            db_max=db_max,
            confidence=confidence,
            remove_dc=remove_dc,
        ) | {"file_name": filename}
    except (OSError, RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        temporary_path.unlink(missing_ok=True)


if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def frontend(full_path: str):
        target = STATIC_DIR / full_path
        if full_path and target.is_file():
            return FileResponse(target)
        return FileResponse(STATIC_DIR / "index.html")
