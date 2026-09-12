import { useEffect, useMemo, useState } from 'react'
import { ControlRail } from './components/ControlRail'
import { EventTimeline } from './components/EventTimeline'
import { Header } from './components/Header'
import { Inspector } from './components/Inspector'
import { ResultPanel } from './components/ResultPanel'
import { WaterfallPanel } from './components/WaterfallPanel'
import { analyze, getModels, getRuntimeConfig, predictImage, uploadModel } from './lib/api'
import { demoResult } from './lib/demo'
import type { AnalysisResult, ModelInfo, PredictionResult, PreprocessSettings, RuntimeConfig } from './types'

const initialSettings: PreprocessSettings = { fftSize: 1024, hopLength: 256, window: 'hann', colorMap: 'ocean', dbMin: -100, dbMax: -20, removeDc: true, confidence: 0.25 }

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [model, setModel] = useState('')
  const [settings, setSettings] = useState(initialSettings)
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [selected, setSelected] = useState<number | null>(demoResult.detections[0].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getModels().then((items) => { setModels(items); if (items.length) setModel(items[0].id) }).catch(() => setModels([]))
    getRuntimeConfig().then(setRuntimeConfig).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (result) return
    const timer = window.setInterval(() => setSelected((current) => {
      const index = demoResult.detections.findIndex((item) => item.id === current)
      return demoResult.detections[(index + 1) % demoResult.detections.length].id
    }), 2400)
    return () => window.clearInterval(timer)
  }, [result])

  const waterfallResult = useMemo<AnalysisResult | null>(() => {
    if (!result) return demoResult
    if (result.input_type !== 'h5' || !result.metadata || !result.detections || result.image === undefined) return null
    return result as PredictionResult & AnalysisResult
  }, [result])
  const selectedDetection = useMemo(
    () => waterfallResult?.detections.find((item) => item.id === selected),
    [waterfallResult, selected],
  )

  const runAnalysis = async () => {
    if (!file) return
    setBusy(true); setError('')
    try {
      const isImage = /\.(png|jpe?g|bmp|webp|tiff?)$/i.test(file.name)
      let next: PredictionResult
      if (isImage) next = { ...await predictImage(file, model, settings.confidence), input_size_bytes: file.size }
      else {
        const analysed = await analyze(file, model, { ...settings, fftSize: runtimeConfig?.fft_size ?? settings.fftSize, hopLength: runtimeConfig?.hop_length ?? settings.hopLength, window: runtimeConfig?.window ?? settings.window })
        next = { ...analysed, input_type: 'h5', input_size_bytes: file.size, predictions: analysed.detections.map((item) => ({ class_id: item.class_id, class_name: item.class_name, confidence: item.confidence })) }
      }
      setResult(next)
      setSelected(next.detections?.[0]?.id ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '解析失败') } finally { setBusy(false) }
  }

  const importModel = async (candidate: File) => {
    setError('')
    try { const next = await uploadModel(candidate); setModels(next); setModel(candidate.name) } catch (cause) { setError(cause instanceof Error ? cause.message : '模型导入失败') }
  }

  const resetShowcase = () => {
    setFile(null)
    setResult(null)
    setSelected(demoResult.detections[0].id)
    setError('')
  }

  return <div className="app-shell">
    <Header fileName={file?.name || result?.file_name || demoResult.file_name} inputType={result?.input_type || (file ? (/\.(h(df)?5)$/i.test(file.name) ? 'H5' : '图片') : '产品展台')} modelName={model || result?.model || demoResult.model} />
    <main className={`dashboard-layout ${waterfallResult ? '' : 'result-only-layout'}`}>
      <ControlRail file={file} models={models} model={model} settings={settings} runtimeConfig={runtimeConfig} busy={busy} error={error} onFile={setFile} onModel={setModel} onSettings={setSettings} onAnalyze={runAnalysis} onModelUpload={importModel} onResetShowcase={resetShowcase} />
      {waterfallResult ? <>
        <div className="analysis-workspace">
          <WaterfallPanel result={waterfallResult} selected={selected} onSelect={setSelected} busy={busy} showcase={!result} />
          <EventTimeline detections={waterfallResult.detections} selected={selected} onSelect={setSelected} />
        </div>
        <Inspector result={waterfallResult} detection={selectedDetection} />
      </> : <div className="analysis-workspace result-workspace"><ResultPanel result={result} busy={busy} /></div>}
    </main>
  </div>
}
