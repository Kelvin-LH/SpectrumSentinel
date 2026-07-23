import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { Cpu, FileUp, Play, UploadCloud } from 'lucide-react'
import type { ModelInfo, PreprocessSettings, RuntimeConfig } from '../types'

interface ControlRailProps {
  file: File | null
  models: ModelInfo[]
  model: string
  settings: PreprocessSettings
  busy: boolean
  error: string
  onFile: (file: File) => void
  onModel: (value: string) => void
  runtimeConfig: RuntimeConfig | null
  onSettings: (settings: PreprocessSettings) => void
  onAnalyze: () => void
  onModelUpload: (file: File) => void
}

function humanSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** unit).toFixed(unit > 1 ? 1 : 0)} ${units[unit]}`
}

export function ControlRail(props: ControlRailProps) {
  const { file, models, model, settings, busy, error, runtimeConfig } = props
  const fileInput = useRef<HTMLInputElement>(null)
  const modelInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const acceptFile = (candidate?: File) => {
    if (candidate && /\.(h(df)?5|png|jpe?g|bmp|webp|tiff?)$/i.test(candidate.name)) props.onFile(candidate)
  }
  const drop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    acceptFile(event.dataTransfer.files[0])
  }
  const update = <K extends keyof PreprocessSettings>(key: K, value: PreprocessSettings[K]) =>
    props.onSettings({ ...settings, [key]: value })

  return (
    <aside className="control-rail">
      <section className="rail-section">
        <div className="section-title"><span>01</span><h2>输入数据</h2></div>
        <button
          className={`drop-zone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
        >
          <UploadCloud size={23} />
          {file ? <><strong>{file.name}</strong><small>{humanSize(file.size)} · 点击替换</small></> : <><strong>拖入 H5 或图片</strong><small>支持 H5、PNG、JPG 等格式</small></>}
        </button>
        <input ref={fileInput} className="sr-only" type="file" accept=".h5,.hdf5,.png,.jpg,.jpeg,.bmp,.webp,.tif,.tiff" onChange={(event) => acceptFile(event.target.files?.[0])} />
        <div className="limit-note"><span>输入规范</span><strong>{runtimeConfig ? `H5 固定截取前 ${runtimeConfig.frame_limit.toLocaleString()} 帧` : 'H5 固定截取前 2,000 帧'}</strong></div>
      </section>

      <section className="rail-section">
        <div className="section-title"><span>02</span><h2>训练预处理</h2></div>
        <div className="locked-config"><span>识别参数跟随训练配置</span><strong>FFT {runtimeConfig?.fft_size ?? settings.fftSize} · 步长 {runtimeConfig?.hop_length ?? settings.hopLength}</strong><small>{runtimeConfig?.window?.toUpperCase() ?? 'HANN'} 窗 · 输入 {runtimeConfig?.imgsz ?? 640}px</small></div>
      </section>

      <section className="rail-section model-section">
        <div className="section-title"><span>03</span><h2>信号模型</h2></div>
        <label>检测模型<select value={model} onChange={(event) => props.onModel(event.target.value)}><option value="">仅预处理，不执行检测</option>{models.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.format.toUpperCase()}</option>)}</select></label>
        <div className="range-head"><span>置信度阈值</span><strong>{Math.round(settings.confidence * 100)}%</strong></div>
        <input className="range" type="range" min="0.05" max="0.95" step="0.01" value={settings.confidence} onChange={(event) => update('confidence', Number(event.target.value))} />
        <button className="secondary-button" onClick={() => modelInput.current?.click()}><FileUp size={15} />导入模型</button>
        <input ref={modelInput} className="sr-only" type="file" accept=".pt,.onnx,.engine,.torchscript" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files?.[0] && props.onModelUpload(event.target.files[0])} />
      </section>

      {error && <div className="error-message" role="alert">{error}</div>}
      <div className="rail-actions">
        <button className="primary-button" disabled={!file || busy} onClick={props.onAnalyze}>{busy ? <><Cpu className="spin" size={17} />正在解析</> : <><Play size={17} fill="currentColor" />开始解析</>}</button>
      </div>
    </aside>
  )
}
