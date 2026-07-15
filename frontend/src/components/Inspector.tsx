import { Activity, Clock3, Radio, Waves } from 'lucide-react'
import type { AnalysisResult, Detection } from '../types'

interface InspectorProps { result: AnalysisResult; detection?: Detection }

const mhz = (value: number) => `${(value / 1e6).toFixed(3)} MHz`
const seconds = (value: number) => `${value.toFixed(4)} s`

function DataRow({ label, value }: { label: string; value: string }) {
  return <div className="data-row"><span>{label}</span><strong>{value}</strong></div>
}

export function Inspector({ result, detection }: InspectorProps) {
  return (
    <aside className="inspector">
      <div className="inspector-heading"><h2>检测详情</h2><span>{detection ? `目标 #${detection.id}` : '选择检测框'}</span></div>
      {detection ? (
        <>
          <div className="target-title"><i /><div><small>信号类别</small><strong>{detection.class_name}</strong></div><em>{Math.round(detection.confidence * 100)}%</em></div>
          <div className="confidence-track"><i style={{ width: `${detection.confidence * 100}%` }} /></div>
          <section className="detail-group"><h3><Clock3 size={14} />时间信息</h3><DataRow label="起始帧" value={detection.frame_start.toLocaleString()} /><DataRow label="结束帧" value={detection.frame_end.toLocaleString()} /><DataRow label="起始时间" value={seconds(detection.time_start_s)} /><DataRow label="结束时间" value={seconds(detection.time_end_s)} /><DataRow label="持续时间" value={seconds(detection.time_end_s - detection.time_start_s)} /></section>
          <section className="detail-group"><h3><Radio size={14} />频率信息</h3><DataRow label="中心频率" value={mhz(detection.center_frequency_hz)} /><DataRow label="最低频率" value={mhz(detection.frequency_low_hz)} /><DataRow label="最高频率" value={mhz(detection.frequency_high_hz)} /><DataRow label="信号带宽" value={mhz(detection.bandwidth_hz)} /></section>
        </>
      ) : <div className="inspector-empty"><Waves size={28} /><p>点击瀑布图中的检测框，查看该信号的时间与频率信息。</p></div>}
      <section className="source-summary">
        <h3><Activity size={14} />采集信息</h3>
        <DataRow label="中心频率" value={mhz(result.metadata.center_frequency_hz)} />
        <DataRow label="采样率" value={mhz(result.metadata.sample_rate_hz)} />
        <DataRow label="采集带宽" value={mhz(result.metadata.bandwidth_hz)} />
        <DataRow label="采集时间" value={result.metadata.start_time?.replace('T', ' ').replace('Z', '') || 'H5 未提供'} />
        <DataRow label="IQ 数据集" value={result.metadata.source_dataset} />
      </section>
    </aside>
  )
}
