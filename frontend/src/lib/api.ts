import type { AnalysisResult, ModelInfo, PreprocessSettings } from '../types'

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json()
    return body.detail || '请求失败'
  } catch {
    return `请求失败（${response.status}）`
  }
}

export async function getModels(): Promise<ModelInfo[]> {
  const response = await fetch('/api/models')
  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()).models
}

export async function uploadModel(file: File): Promise<ModelInfo[]> {
  const body = new FormData()
  body.append('file', file)
  const response = await fetch('/api/models', { method: 'POST', body })
  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()).models
}

export async function analyze(
  file: File,
  model: string,
  settings: PreprocessSettings,
): Promise<AnalysisResult> {
  const body = new FormData()
  body.append('file', file)
  body.append('model', model)
  body.append('fft_size', String(settings.fftSize))
  body.append('hop_length', String(settings.hopLength))
  body.append('window', settings.window)
  body.append('color_map', settings.colorMap)
  body.append('db_min', String(settings.dbMin))
  body.append('db_max', String(settings.dbMax))
  body.append('confidence', String(settings.confidence))
  body.append('remove_dc', String(settings.removeDc))
  const response = await fetch('/api/analyze', { method: 'POST', body })
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}
