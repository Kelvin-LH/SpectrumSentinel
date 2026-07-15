from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(slots=True)
class SignalMetadata:
    sample_rate_hz: float = 0.0
    center_frequency_hz: float = 0.0
    bandwidth_hz: float = 0.0
    start_time: str | None = None
    source_dataset: str = ""
    source_samples: int = 0
    processed_samples: int = 0
    processed_frames: int = 0
    frame_limit: int = 2000

    @property
    def frequency_low_hz(self) -> float:
        bandwidth = self.bandwidth_hz or self.sample_rate_hz
        return self.center_frequency_hz - bandwidth / 2

    @property
    def frequency_high_hz(self) -> float:
        bandwidth = self.bandwidth_hz or self.sample_rate_hz
        return self.center_frequency_hz + bandwidth / 2

    @property
    def duration_s(self) -> float:
        if self.sample_rate_hz <= 0:
            return 0.0
        return self.processed_samples / self.sample_rate_hz

    def to_dict(self) -> dict:
        result = asdict(self)
        result.update(
            frequency_low_hz=self.frequency_low_hz,
            frequency_high_hz=self.frequency_high_hz,
            duration_s=self.duration_s,
        )
        return result


@dataclass(slots=True)
class Detection:
    id: int
    class_id: int
    class_name: str
    confidence: float
    x: float
    y: float
    width: float
    height: float
    frame_start: int
    frame_end: int
    time_start_s: float
    time_end_s: float
    frequency_low_hz: float
    frequency_high_hz: float
    center_frequency_hz: float
    bandwidth_hz: float

    def to_dict(self) -> dict:
        return asdict(self)
