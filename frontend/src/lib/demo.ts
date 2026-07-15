import type { AnalysisResult } from '../types'

export const demoDetections = [
  { id: 1, class_id: 0, class_name: 'LTE', confidence: 0.94, x: 0.08, y: 0.06, width: 0.075, height: 0.72, frame_start: 120, frame_end: 1560, time_start_s: 0.31, time_end_s: 4.03, frequency_low_hz: 99_400_000, frequency_high_hz: 100_150_000, center_frequency_hz: 99_775_000, bandwidth_hz: 750_000 },
  { id: 2, class_id: 2, class_name: 'FM', confidence: 0.88, x: 0.29, y: 0.18, width: 0.12, height: 0.64, frame_start: 360, frame_end: 1640, time_start_s: 0.93, time_end_s: 4.23, frequency_low_hz: 101_500_000, frequency_high_hz: 102_700_000, center_frequency_hz: 102_100_000, bandwidth_hz: 1_200_000 },
  { id: 3, class_id: 4, class_name: 'QPSK', confidence: 0.96, x: 0.53, y: 0.10, width: 0.09, height: 0.78, frame_start: 200, frame_end: 1760, time_start_s: 0.52, time_end_s: 4.54, frequency_low_hz: 103_900_000, frequency_high_hz: 104_800_000, center_frequency_hz: 104_350_000, bandwidth_hz: 900_000 },
  { id: 4, class_id: 1, class_name: 'DTMB', confidence: 0.91, x: 0.76, y: 0.25, width: 0.16, height: 0.51, frame_start: 500, frame_end: 1520, time_start_s: 1.29, time_end_s: 3.92, frequency_low_hz: 106_200_000, frequency_high_hz: 107_800_000, center_frequency_hz: 107_000_000, bandwidth_hz: 1_600_000 },
]

export const demoResult: AnalysisResult = {
  file_name: 'exhibition_signal.h5',
  image: '',
  image_width: 1200,
  image_height: 760,
  orientation: 'vertical_time',
  metadata: {
    sample_rate_hz: 20_000_000,
    center_frequency_hz: 104_000_000,
    bandwidth_hz: 10_000_000,
    start_time: '2026-07-16T10:28:16Z',
    source_dataset: '/iq/samples',
    source_samples: 8_000_000,
    processed_samples: 512_768,
    processed_frames: 2000,
    frame_limit: 2000,
    frequency_low_hz: 99_000_000,
    frequency_high_hz: 109_000_000,
    duration_s: 5.128,
  },
  detections: demoDetections,
  preprocessing: { fft_size: 1024, hop_length: 256, color_map: 'ocean' },
  model: 'signal-exhibition-v1.pt',
}
