export interface ModelInfo {
  id: string
  name: string
  format: string
  size_bytes: number
}

export interface SignalMetadata {
  sample_rate_hz: number
  center_frequency_hz: number
  bandwidth_hz: number
  start_time: string | null
  source_dataset: string
  source_samples: number
  processed_samples: number
  processed_frames: number
  frame_limit: number
  frequency_low_hz: number
  frequency_high_hz: number
  duration_s: number
}

export interface Detection {
  id: number
  class_id: number
  class_name: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  frame_start: number
  frame_end: number
  time_start_s: number
  time_end_s: number
  frequency_low_hz: number
  frequency_high_hz: number
  center_frequency_hz: number
  bandwidth_hz: number
}

export interface AnalysisResult {
  file_name: string
  image: string
  image_width: number
  image_height: number
  orientation: 'vertical_time'
  metadata: SignalMetadata
  detections: Detection[]
  preprocessing: Record<string, string | number | boolean>
  model: string | null
}

export interface PreprocessSettings {
  fftSize: number
  hopLength: number
  window: string
  colorMap: string
  dbMin: number
  dbMax: number
  removeDc: boolean
  confidence: number
}

export interface Prediction {
  class_id: number
  class_name: string
  confidence: number
}

export interface PredictionResult {
  file_name: string
  input_type: 'h5' | 'image'
  model: string | null
  predictions: Prediction[]
  metadata?: SignalMetadata
  detections?: Detection[]
  input_size_bytes?: number
  image_width?: number
  image_height?: number
  image?: string
  orientation?: 'vertical_time'
  preprocessing?: Record<string, string | number | boolean>
}

export interface RuntimeConfig {
  fft_size: number
  hop_length: number
  window: string
  frame_limit: number
  imgsz: number
  model: string
  source: string
}
