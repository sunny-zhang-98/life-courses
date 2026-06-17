import { useRef, useEffect } from 'react'

const COLORS = {
  available: { bg: 'rgba(108, 92, 231, 0.2)', border: '#6c5ce7', text: '#a29bfe', dim: '#6b5b9e' },
  learned:   { bg: 'rgba(0, 184, 148, 0.2)', border: '#00b894', text: '#55efc4', dim: '#2a8a7a' },
  folder:    { bg: 'rgba(253, 203, 110, 0.18)', border: '#fdcb6e', text: '#fdcb6e', dim: '#9a8a5e' },
  folderLearned: { bg: 'rgba(0, 184, 148, 0.25)', border: '#00b894', text: '#55efc4', dim: '#2a8a7a' }
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || ''
  return str.slice(0, maxLen) + '…'
}

export default function SkillTree({ nodes, edges, onNodeClick, learnedIds }) {
  const canvasRef = useRef(null)
  const state = useRef({
    panX: 0, panY: 0,
    centerDone: false,
    mDown: false,
    mDownX: 0, mDownY: 0,
    mDownPanX: 0, mDownPanY: 0,
    moved: false
  })

  // ---- draw ----
  function draw() {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    const w = cvs.width, h = cvs.height
    const s = state.current

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.translate(s.panX, s.panY)

    // auto‑center once
    if (!s.centerDone && nodes.length > 0) {
      const xs = nodes.map(n => n.x)
      const ys = nodes.map(n => n.y)
      const maxX = Math.max(...xs) + nodes[0].width
      const maxY = Math.max(...ys) + nodes[0].height
      const cx = (Math.min(...xs) + maxX) / 2
      const cy = (Math.min(...ys) + maxY) / 2
      s.panX = w / 2 - cx
      s.panY = h / 2 - cy
      s.centerDone = true
      ctx.translate(w / 2 - cx, h / 2 - cy)
    }

    // edges (order arrows between siblings)
    for (const e of edges) {
      ctx.beginPath()
      ctx.setLineDash([6, 4])
      ctx.strokeStyle = 'rgba(253, 203, 110, 0.5)'
      ctx.lineWidth = 1.5
      ctx.moveTo(e.fromX, e.fromY)
      const cpY = (e.toY - e.fromY) * 0.3
      ctx.bezierCurveTo(e.fromX, e.fromY + cpY, e.toX, e.toY - cpY, e.toX, e.toY)
      ctx.stroke()
      ctx.setLineDash([])
      // arrowhead
      const angle = Math.atan2(e.toY - e.fromY, e.toX - e.fromX)
      const aLen = 8
      ctx.beginPath()
      ctx.moveTo(e.toX, e.toY)
      ctx.lineTo(e.toX - aLen * Math.cos(angle - 0.4), e.toY - aLen * Math.sin(angle - 0.4))
      ctx.moveTo(e.toX, e.toY)
      ctx.lineTo(e.toX - aLen * Math.cos(angle + 0.4), e.toY - aLen * Math.sin(angle + 0.4))
      ctx.strokeStyle = 'rgba(253, 203, 110, 0.7)'
      ctx.stroke()
    }

    // nodes
    for (const n of nodes) {
      const learned = learnedIds.includes(n.id)
      let c
      if (n.hasChildren) {
        c = learned ? COLORS.folderLearned : COLORS.folder
      } else {
        c = learned ? COLORS.learned : COLORS.available
      }

      ctx.beginPath()
      ctx.roundRect(n.x, n.y, n.width, n.height, 8)
      ctx.fillStyle = c.bg
      ctx.fill()
      ctx.strokeStyle = c.border
      ctx.lineWidth = learned ? 2 : 1.5
      ctx.stroke()

      // Title
      ctx.fillStyle = c.text
      ctx.font = 'bold 13px -apple-system, "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(n.title, n.x + n.width / 2, n.y + 22)

      // Summary (truncated)
      const summary = truncate(n.summary, 15)
      ctx.fillStyle = c.dim
      ctx.font = '10px -apple-system, "PingFang SC", sans-serif'
      ctx.fillText(summary, n.x + n.width / 2, n.y + 48)

      if (learned) {
        ctx.fillStyle = '#00b894'
        ctx.font = 'bold 14px sans-serif'
        ctx.fillText('✓', n.x + n.width - 20, n.y + 22)
      }

      // Folder indicator for nodes with children
      if (n.hasChildren) {
        ctx.font = '11px sans-serif'
        ctx.fillText('📂', n.x + 12, n.y + 22)
      }
    }
    ctx.restore()
  }

  // resize + initial draw
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const parent = cvs.parentElement
    const resize = () => {
      cvs.width = parent.clientWidth
      cvs.height = parent.clientHeight
      draw()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, []) // only mount/unmount

  // redraw when data changes (keep existing pan position)
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const parent = cvs.parentElement
    cvs.width = parent.clientWidth
    cvs.height = parent.clientHeight
    draw()
  }, [nodes, edges, learnedIds])

  // mouse events
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const s = state.current

    function onmousedown(e) {
      s.mDown = true
      s.moved = false
      s.mDownX = e.clientX
      s.mDownY = e.clientY
      s.mDownPanX = s.panX
      s.mDownPanY = s.panY
    }

    function onmousemove(e) {
      // Only pan while button is physically held
      if (!(e.buttons & 1)) { s.mDown = false; return }
      if (!s.mDown) return
      const dx = e.clientX - s.mDownX
      const dy = e.clientY - s.mDownY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        s.moved = true
        s.panX = s.mDownPanX + dx
        s.panY = s.mDownPanY + dy
        draw()
      }
    }

    function onmouseup(e) {
      if (!s.moved && s.mDown) {
        // click
        const rect = cvs.getBoundingClientRect()
        const mx = e.clientX - rect.left - s.panX
        const my = e.clientY - rect.top - s.panY
        // iterate in reverse so topmost node wins
        for (let i = nodes.length - 1; i >= 0; i--) {
          const n = nodes[i]
          if (mx >= n.x && mx <= n.x + n.width && my >= n.y && my <= n.y + n.height) {
            onNodeClick?.(n.id, e)
            break
          }
        }
      }
      s.mDown = false
      s.moved = false
    }

    cvs.addEventListener('mousedown', onmousedown)
    window.addEventListener('mousemove', onmousemove)
    window.addEventListener('mouseup', onmouseup)
    return () => {
      cvs.removeEventListener('mousedown', onmousedown)
      window.removeEventListener('mousemove', onmousemove)
      window.removeEventListener('mouseup', onmouseup)
    }
  }, [nodes, onNodeClick])

  return <canvas ref={canvasRef} className="skill-tree-canvas" />
}
