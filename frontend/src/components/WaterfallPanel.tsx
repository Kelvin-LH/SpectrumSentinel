import { useEffect, useRef } from 'react'
import { Crosshair, Maximize2, ScanLine } from 'lucide-react'
import type { AnalysisResult, Detection } from '../types'

interface WaterfallPanelProps {
  result: AnalysisResult
  selected: number | null
  onSelect: (id: number) => void
  busy: boolean
  showcase?: boolean
}

function drawDemo(canvas: HTMLCanvasElement) {
  const width = 1200
  const height = 760
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  const image = context.createImageData(width, height)
  let seed = 42
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const texture = random() * 12 + 5 * Math.sin(y * 0.15 + x * 0.01)
      image.data[index] = 1
      image.data[index + 1] = 13 + texture
      image.data[index + 2] = 29 + texture * 2.1
      image.data[index + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  context.globalCompositeOperation = 'screen'
  const signals = [
    { x: .115, width: .028, start: .03, end: .82, intensity: .78 },
    { x: .34, width: .055, start: .14, end: .88, intensity: .64 },
    { x: .575, width: .035, start: .05, end: .93, intensity: .9 },
    { x: .83, width: .08, start: .2, end: .8, intensity: .66 },
  ]
  signals.forEach((signal, signalIndex) => {
    const x = signal.x * width
    const startY = signal.start * height
    const endY = signal.end * height
    const gradient = context.createLinearGradient(x - 50, 0, x + 50, 0)
    gradient.addColorStop(0, 'rgba(0,100,140,0)')
    gradient.addColorStop(.42, 'rgba(19,202,191,.25)')
    gradient.addColorStop(.5, `rgba(90,255,219,${signal.intensity})`)
    gradient.addColorStop(.58, 'rgba(18,184,189,.25)')
    gradient.addColorStop(1, 'rgba(0,100,140,0)')
    context.fillStyle = gradient
    context.fillRect(x - signal.width * width, startY, signal.width * width * 2, endY - startY)
    context.strokeStyle = 'rgba(127,255,222,.32)'
    context.lineWidth = 1
    for (let offset = -2; offset <= 2; offset += 1) {
      context.beginPath()
      for (let y = startY; y <= endY; y += 4) {
        const wobble = Math.sin(y * .04 + signalIndex) * 3 + (random() - .5) * 6
        const px = x + wobble + offset * 7
        if (y === startY) context.moveTo(px, y); else context.lineTo(px, y)
      }
      context.stroke()
    }
  })
  context.globalCompositeOperation = 'source-over'
}

function DetectionBox({ detection, active, onClick }: { detection: Detection; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`detection-box ${active ? 'is-active' : ''}`}
      style={{ left: `${detection.x * 100}%`, top: `${detection.y * 100}%`, width: `${detection.width * 100}%`, height: `${detection.height * 100}%` }}
      onClick={onClick}
      aria-label={`${detection.class_name}，置信度 ${Math.round(detection.confidence * 100)}%`}
    >
      <span className="detection-label">
        <strong>{detection.class_name}</strong>
        <b>{detection.confidence.toFixed(2)}</b>
      </span>
    </button>
  )
}

export function WaterfallPanel({ result, selected, onSelect, busy, showcase = false }: WaterfallPanelProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => { if (!result.image && canvas.current) drawDemo(canvas.current) }, [result.image])
  const low = result.metadata.frequency_low_hz / 1e6
  const high = result.metadata.frequency_high_hz / 1e6
  const frequencyTicks = Array.from({ length: 6 }, (_, index) => low + (high - low) * index / 5)
  const frameTicks = Array.from({ length: 6 }, (_, index) => Math.round(result.metadata.processed_frames * index / 5))

  return (
    <section className="waterfall-panel">
      <div className="panel-heading">
        <div><ScanLine size={17} /><h2>垂直瀑布图</h2><span>{showcase ? '产品展台 · 自动巡检' : '时间向下流动'}</span></div>
        <div className="canvas-tools"><button title="定位选中目标"><Crosshair size={15} /></button><button title="全屏展示"><Maximize2 size={15} /></button></div>
      </div>
      <div className={`waterfall-stage ${busy ? 'is-busy' : ''}`}>
        <div className="time-axis"><span>时间 / 帧</span>{frameTicks.map((value) => <b key={value} style={{ top: `${value / Math.max(result.metadata.processed_frames, 1) * 100}%` }}>{value}</b>)}</div>
        <div className={`waterfall-image ${showcase ? 'is-showcase' : ''}`}>
          {result.image ? <img src={result.image} alt="H5 信号垂直瀑布图" /> : <canvas ref={canvas} aria-label="展台示例垂直瀑布图" />}
          <div className="technical-grid" />
          {result.detections.map((detection) => <DetectionBox key={detection.id} detection={detection} active={selected === detection.id} onClick={() => onSelect(detection.id)} />)}
          {busy && <div className="scan-overlay"><i /><span>正在解析信号特征</span></div>}
        </div>
        <div className="frequency-axis">{frequencyTicks.map((value) => <b key={value}>{value.toFixed(1)}</b>)}<span>频率（MHz）</span></div>
      </div>
      <div className="color-scale"><span>信号强度</span><i /><small>−100 dB</small><small>−20 dB</small></div>
    </section>
  )
}
