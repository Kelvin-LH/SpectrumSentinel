import { useEffect, useMemo, useState } from 'react'
import { ControlRail } from './components/ControlRail'
import { EventTimeline } from './components/EventTimeline'
import { Header } from './components/Header'
import { Inspector } from './components/Inspector'
import { WaterfallPanel } from './components/WaterfallPanel'
import { analyze, getModels, uploadModel } from './lib/api'
import { demoResult } from './lib/demo'
import type { AnalysisResult, ModelInfo, PreprocessSettings } from './types'

const initialSettings: PreprocessSettings = {
  fftSize: 1024,
  hopLength: 256,
  window: 'hann',
  colorMap: 'ocean',
  dbMin: -100,
  dbMax: -20,
  removeDc: true,
  confidence: 0.25,
}

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [model, setModel] = useState('')
  const [settings, setSettings] = useState(initialSettings)
  const [result, setResult] = useState<AnalysisResult>(demoResult)
  const [selected, setSelected] = useState<number | null>(demoResult.detections[2].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getModels().then((items) => { setModels(items); if (items.length) setModel(items[0].id) }).catch(() => setModels([]))
  }, [])

  const selectedDetection = useMemo(() => result.detections.find((item) => item.id === selected), [result, selected])

  const runAnalysis = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const next = await analyze(file, model, settings)
      setResult(next)
      setSelected(next.detections[0]?.id ?? null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '解析失败')
    } finally {
      setBusy(false)
    }
  }

  const importModel = async (candidate: File) => {
    setError('')
    try {
      const next = await uploadModel(candidate)
      setModels(next)
      setModel(candidate.name)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '模型导入失败')
    }
  }

  const resetDemo = () => {
    setResult(demoResult)
    setSelected(demoResult.detections[2].id)
    setError('')
  }

  return (
    <div className="app-shell">
      <Header fileName={file?.name || result.file_name} frames={result.metadata.processed_frames} modelName={model || result.model} />
      <main className="dashboard-layout">
        <ControlRail file={file} models={models} model={model} settings={settings} busy={busy} error={error} onFile={setFile} onModel={setModel} onSettings={setSettings} onAnalyze={runAnalysis} onModelUpload={importModel} onResetDemo={resetDemo} />
        <div className="analysis-workspace">
          <WaterfallPanel result={result} selected={selected} onSelect={setSelected} busy={busy} />
          <EventTimeline detections={result.detections} selected={selected} onSelect={setSelected} />
        </div>
        <Inspector result={result} detection={selectedDetection} />
      </main>
    </div>
  )
}
