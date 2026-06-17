const shortcuts = [
  { key: '点击', desc: '知识详情' },
  { key: '⌘/⌃+点击', desc: '进入子目录' },
  { key: '拖拽', desc: '移动节点' },
  { key: 'Esc', desc: '返回上级' },
  { key: '滚轮', desc: '缩放' },
]

export default function BottomToolbar() {
  return (
    <div className="bottom-toolbar">
      {shortcuts.map(s => (
        <span key={s.key} className="toolbar-item">
          <kbd>{s.key}</kbd>
          <span className="toolbar-desc">{s.desc}</span>
        </span>
      ))}
    </div>
  )
}
