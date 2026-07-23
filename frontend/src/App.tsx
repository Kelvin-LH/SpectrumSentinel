import { useEffect, useState } from 'react'
import { ControlRail } from './components/ControlRail'
import { Header } from './components/Header'
import { ResultPanel } from './components/ResultPanel'
import { analyze, getModels, getRuntimeConfig, predictImage, uploadModel } from './lib/api'
import type { ModelInfo, PredictionResult, PreprocessSettings, RuntimeConfig } from './types'

const initialSettings: PreprocessSettings = { fftSize: 1024, hopLength: 256, window: 'hann', colorMap: 'ocean', dbMin: -100, dbMax: -20, removeDc: true, confidence: 0.25 }

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [model, setModel] = useState('')
  const [settings, setSettings] = useState(initialSettings)
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getModels().then((items) => { setModels(items); if (items.length) setModel(items[0].id) }).catch(() => setModels([]))
    getRuntimeConfig().then(setRuntimeConfig).catch(() => undefined)
  }, [])

  const runAnalysis = async () => {
    if (!file) return
    setBusy(true); setError('')
    try {
      const isImage = /\.(png|jpe?g|bmp|webp|tiff?)$/i.test(file.name)
      let next: PredictionResult
      if (isImage) next = await predictImage(file, model, settings.confidence)
      else {
        const analysed = await analyze(file, model, { ...settings, fftSize: runtimeConfig?.fft_size ?? settings.fftSize, hopLength: runtimeConfig?.hop_length ?? settings.hopLength, window: runtimeConfig?.window ?? settings.window })
        next = { file_name: analysed.file_name, input_type: 'h5', model: analysed.model, metadata: analysed.metadata, predictions: analysed.detections.map((item) => ({ class_id: item.class_id, class_name: item.class_name, confidence: item.confidence })) }
      }
      setResult(next)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '解析失败') } finally { setBusy(false) }
  }

  const importModel = async (candidate: File) => {
    setError('')
    try { const next = await uploadModel(candidate); setModels(next); setModel(candidate.name) } catch (cause) { setError(cause instanceof Error ? cause.message : '模型导入失败') }
  }

  return <div className="app-shell">
    <Header fileName={file?.name || result?.file_name || ''} frames={result?.metadata?.processed_frames ?? 0} modelName={model || result?.model || null} />
    <main className="dashboard-layout">
      <ControlRail file={file} models={models} model={model} settings={settings} runtimeConfig={runtimeConfig} busy={busy} error={error} onFile={setFile} onModel={setModel} onSettings={setSettings} onAnalyze={runAnalysis} onModelUpload={importModel} />
      <div className="analysis-workspace"><ResultPanel result={result} busy={busy} /></div>
    </main>
  </div>
}
