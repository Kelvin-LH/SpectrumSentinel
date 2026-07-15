import { CheckCircle2, RadioTower } from 'lucide-react'
import { BrandMark } from './BrandMark'

interface HeaderProps {
  fileName: string
  frames: number
  modelName: string | null
}

export function Header({ fileName, frames, modelName }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <BrandMark />
        <div className="brand-copy"><strong>谱鉴</strong><span>Spectrum Sentinel</span></div>
        <div className="brand-divider" />
        <p>智能射频信号洞察台</p>
      </div>
      <div className="header-status">
        <div className="status-item">
          <span className="status-icon is-live"><RadioTower size={17} /></span>
          <div><small>数据源</small><strong>{fileName || '等待 H5'}</strong></div>
        </div>
        <div className="status-item">
          <span className="status-icon"><CheckCircle2 size={17} /></span>
          <div><small>解析范围</small><strong>{frames ? `${frames.toLocaleString()} 帧` : '前 2,000 帧'}</strong></div>
        </div>
        <div className="status-item model-status">
          <div><small>当前模型</small><strong>{modelName || '尚未选择'}</strong></div>
        </div>
      </div>
    </header>
  )
}
