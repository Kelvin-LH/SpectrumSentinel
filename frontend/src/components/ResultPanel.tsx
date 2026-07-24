import { Activity, CheckCircle2, Database, ListChecks } from 'lucide-react'
import type { Detection, PredictionResult } from '../types'

function formatHz(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(3)} GHz`
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(3)} MHz`
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(2)} kHz`
  return `${value.toFixed(0)} Hz`
}

function formatBytes(value?: number): string {
  if (!value) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`
}

function unionLength(ranges: Array<[number, number]>): number {
  const ordered = ranges
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((left, right) => left[0] - right[0])
  if (!ordered.length) return 0
  let total = 0
  let [start, end] = ordered[0]
  for (const [nextStart, nextEnd] of ordered.slice(1)) {
    if (nextStart <= end) end = Math.max(end, nextEnd)
    else { total += end - start; start = nextStart; end = nextEnd }
  }
  return total + end - start
}

function occupancy(detections: Detection[], duration: number, bandwidth: number) {
  const occupiedTime = unionLength(detections.map((item) => [item.time_start_s, item.time_end_s]))
  const occupiedBandwidth = unionLength(detections.map((item) => [item.frequency_low_hz, item.frequency_high_hz]))
  return {
    occupiedTime,
    timeRate: duration > 0 ? Math.min(100, occupiedTime / duration * 100) : 0,
    occupiedBandwidth,
    frequencyRate: bandwidth > 0 ? Math.min(100, occupiedBandwidth / bandwidth * 100) : 0,
  }
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`metric-item ${accent ? 'is-accent' : ''}`}><span>{label}</span><strong>{value}</strong></div>
}

export function ResultPanel({ result, busy }: { result: PredictionResult | null; busy: boolean }) {
  if (busy) return <section className="result-panel result-empty"><div className="result-orbit" /><strong>正在识别信号</strong><span>模型正在分析输入数据</span></section>
  if (!result) return <section className="result-panel result-empty"><ListChecks size={34} /><strong>等待输入</strong><span>上传 H5 或图片开始识别</span></section>

  const metadata = result.metadata
  const detections = result.detections ?? []
  const usage = metadata ? occupancy(detections, metadata.duration_s, metadata.bandwidth_hz) : null

  return <section className="result-panel">
    <div className="result-heading"><div><span>识别结果</span><h2>{result.predictions.length ? `${result.predictions.length} 个信号类别` : '未检测到目标'}</h2></div><CheckCircle2 size={19} /></div>
    <div className="result-meta"><span>{result.file_name}</span><span>{result.model || '未选择模型'}</span></div>

    {result.predictions.length > 0 ? <div className="prediction-list">{result.predictions.map((item, index) => <article className="prediction-card" key={`${item.class_id}-${index}`}><div className="prediction-dot" /><strong>{item.class_name}</strong><b>{(item.confidence * 100).toFixed(1)}%</b><small>置信度</small></article>)}</div> : <div className="no-result">当前置信度阈值下没有可确认的信号类别</div>}

    <div className="insight-sections">
      <section className="insight-block">
        <div className="insight-title"><Database size={16} /><div><span>数据概况</span><small>监测数据基础信息</small></div></div>
        <div className="metric-grid">
          <Metric label="数据格式" value={result.input_type === 'h5' ? 'H5 / HDF5' : '图片'} />
          <Metric label="文件大小" value={formatBytes(result.input_size_bytes)} />
          {metadata ? <>
            <Metric label="采样率" value={formatHz(metadata.sample_rate_hz)} />
            <Metric label="中心频率" value={formatHz(metadata.center_frequency_hz)} />
            <Metric label="监测带宽" value={formatHz(metadata.bandwidth_hz)} />
            <Metric label="有效时长" value={`${metadata.duration_s.toFixed(4)} s`} />
            <Metric label="有效采样点" value={metadata.processed_samples.toLocaleString()} />
            <Metric label="数据集来源" value={metadata.source_dataset || '未记录'} />
          </> : <>
            <Metric label="图像宽度" value={`${result.image_width ?? 0} px`} />
            <Metric label="图像高度" value={`${result.image_height ?? 0} px`} />
          </>}
        </div>
      </section>

      <section className="insight-block">
        <div className="insight-title"><Activity size={16} /><div><span>频谱占用</span><small>基于识别结果计算</small></div></div>
        {metadata && usage ? <div className="metric-grid occupancy-grid">
          <Metric label="识别目标数" value={`${detections.length}`} />
          <Metric label="时间占用率" value={`${usage.timeRate.toFixed(1)}%`} accent />
          <Metric label="占用时长" value={`${usage.occupiedTime.toFixed(4)} s`} />
          <Metric label="频带占用率" value={`${usage.frequencyRate.toFixed(1)}%`} accent />
          <Metric label="占用带宽" value={formatHz(usage.occupiedBandwidth)} />
          <Metric label="监测频率范围" value={`${formatHz(metadata.frequency_low_hz)} — ${formatHz(metadata.frequency_high_hz)}`} />
        </div> : <div className="occupancy-unavailable">图片未包含可验证的频率与时间标尺，无法计算频谱占用数据。</div>}
      </section>
    </div>
  </section>
}
