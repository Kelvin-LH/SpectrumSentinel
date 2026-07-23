import { CheckCircle2, ListChecks } from 'lucide-react'
import type { PredictionResult } from '../types'

export function ResultPanel({ result, busy }: { result: PredictionResult | null; busy: boolean }) {
  if (busy) return <section className="result-panel result-empty"><div className="result-orbit" /><strong>正在识别信号</strong><span>模型正在分析输入数据</span></section>
  if (!result) return <section className="result-panel result-empty"><ListChecks size={34} /><strong>等待输入</strong><span>上传 H5 或图片开始识别</span></section>
  return <section className="result-panel">
    <div className="result-heading"><div><span>识别结果</span><h2>{result.predictions.length ? `${result.predictions.length} 个信号类别` : '未检测到目标'}</h2></div><CheckCircle2 size={19} /></div>
    <div className="result-meta"><span>{result.file_name}</span><span>{result.model || '未选择模型'}</span></div>
    {result.predictions.length > 0 ? <div className="prediction-list">{result.predictions.map((item, index) => <article className="prediction-card" key={`${item.class_id}-${index}`}><div className="prediction-dot" /><strong>{item.class_name}</strong><b>{(item.confidence * 100).toFixed(1)}%</b><small>置信度</small></article>)}</div> : <div className="no-result">当前置信度阈值下没有可确认的信号类别</div>}
  </section>
}
