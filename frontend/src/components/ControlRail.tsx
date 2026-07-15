import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { Cpu, FileUp, Play, RotateCcw, UploadCloud } from 'lucide-react'
import type { ModelInfo, PreprocessSettings } from '../types'

interface ControlRailProps {
  file: File | null
  models: ModelInfo[]
  model: string
  settings: PreprocessSettings
  busy: boolean
  error: string
  onFile: (file: File) => void
  onModel: (value: string) => void
  onSettings: (settings: PreprocessSettings) => void
  onAnalyze: () => void
  onModelUpload: (file: File) => void
  onResetDemo: () => void
}

function humanSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** unit).toFixed(unit > 1 ? 1 : 0)} ${units[unit]}`
}

export function ControlRail(props: ControlRailProps) {
  const { file, models, model, settings, busy, error } = props
  const fileInput = useRef<HTMLInputElement>(null)
  const modelInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const acceptFile = (candidate?: File) => {
    if (candidate && /\.h(df)?5$/i.test(candidate.name)) props.onFile(candidate)
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
        <div className="section-title"><span>01</span><h2>H5 数据源</h2></div>
        <button
          className={`drop-zone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
        >
          <UploadCloud size={23} />
          {file ? <><strong>{file.name}</strong><small>{humanSize(file.size)} · 点击替换</small></> : <><strong>拖入 H5 样本</strong><small>或点击浏览本地文件</small></>}
        </button>
        <input ref={fileInput} className="sr-only" type="file" accept=".h5,.hdf5" onChange={(event) => acceptFile(event.target.files?.[0])} />
        <div className="limit-note"><span>演示限制</span><strong>固定截取前 2,000 时间帧</strong></div>
      </section>

      <section className="rail-section">
        <div className="section-title"><span>02</span><h2>预处理方式</h2></div>
        <label>FFT 点数<select value={settings.fftSize} onChange={(event) => update('fftSize', Number(event.target.value))}>{[256, 512, 1024, 2048, 4096].map((value) => <option key={value}>{value}</option>)}</select></label>
        <div className="two-fields">
          <label>帧步长<input type="number" min="1" max={settings.fftSize} value={settings.hopLength} onChange={(event) => update('hopLength', Number(event.target.value))} /></label>
          <label>窗函数<select value={settings.window} onChange={(event) => update('window', event.target.value)}><option value="hann">Hann</option><option value="hamming">Hamming</option><option value="blackman">Blackman</option></select></label>
        </div>
        <label>色彩映射<select value={settings.colorMap} onChange={(event) => update('colorMap', event.target.value)}><option value="ocean">深海青</option><option value="viridis">Viridis</option><option value="turbo">Turbo</option><option value="gray">灰度</option></select></label>
        <div className="two-fields">
          <label>最低 dB<input type="number" value={settings.dbMin} onChange={(event) => update('dbMin', Number(event.target.value))} /></label>
          <label>最高 dB<input type="number" value={settings.dbMax} onChange={(event) => update('dbMax', Number(event.target.value))} /></label>
        </div>
        <label className="check-row"><input type="checkbox" checked={settings.removeDc} onChange={(event) => update('removeDc', event.target.checked)} /><span>抑制直流分量</span></label>
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
        <button className="ghost-button" onClick={props.onResetDemo}><RotateCcw size={14} />恢复展台示例</button>
      </div>
    </aside>
  )
}
