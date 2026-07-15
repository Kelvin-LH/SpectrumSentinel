import type { Detection } from '../types'

export function EventTimeline({ detections, selected, onSelect }: { detections: Detection[]; selected: number | null; onSelect: (id: number) => void }) {
  return (
    <section className="event-timeline">
      <div className="timeline-title"><h2>信号事件时间线</h2><span>{detections.length} 个目标</span></div>
      <div className="timeline-track">
        <i className="timeline-line" />
        {detections.map((item, index) => (
          <button
            key={item.id}
            className={selected === item.id ? 'is-active' : ''}
            style={{
              left: `${item.frame_start / 2000 * 100}%`,
              top: `${index * 25 + 5}px`,
              width: `${Math.max((item.frame_end - item.frame_start) / 2000 * 100, 8)}%`,
            }}
            onClick={() => onSelect(item.id)}
          >
            <span>{item.class_name}</span><small>{item.frame_start}–{item.frame_end}</small>
          </button>
        ))}
      </div>
      <div className="timeline-scale"><span>0</span><span>500</span><span>1000</span><span>1500</span><span>2000 帧</span></div>
    </section>
  )
}
