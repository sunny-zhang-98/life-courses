import { useRef, useEffect } from 'react'

const DARK = {
  available: { bg: 'rgba(108, 92, 231, 0.2)', border: '#6c5ce7', text: '#a29bfe', dim: '#6b5b9e' },
  learned:   { bg: 'rgba(0, 184, 148, 0.2)', border: '#00b894', text: '#55efc4', dim: '#2a8a7a' },
  folder:    { bg: 'rgba(253, 203, 110, 0.18)', border: '#fdcb6e', text: '#fdcb6e', dim: '#9a8a5e' },
  folderLearned: { bg: 'rgba(0, 184, 148, 0.25)', border: '#00b894', text: '#55efc4', dim: '#2a8a7a' }
}

const LIGHT = {
  available: { bg: 'rgba(108, 92, 231, 0.07)', border: '#6c5ce7', text: '#5a4bd1', dim: '#8b7cf7' },
  learned:   { bg: 'rgba(0, 163, 129, 0.07)', border: '#00a381', text: '#007a63', dim: '#00a381' },
  folder:    { bg: 'rgba(214, 137, 16, 0.1)', border: '#d68910', text: '#b0780e', dim: '#d68910' },
  folderLearned: { bg: 'rgba(0, 163, 129, 0.12)', border: '#00a381', text: '#007a63', dim: '#00a381' }
}

const MIN_SCALE = 0.3
const MAX_SCALE = 2.0
const NODE_W = 160
const NODE_H = 72

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || ''
  return str.slice(0, maxLen) + '…'
}

export default function SkillTree({ nodes, edges, onNodeClick, learnedIds }) {
  const canvasRef = useRef(null)
  const drawRef = useRef(null)
  const animRef = useRef(null)
  const dashOffsetRef = useRef(0)
  const dragPos = useRef({}) // { [id]: {x, y} } — user-dragged positions
  const dragging = useRef(null) // { id, grabX, grabY, mouseX, mouseY } or null
  const state = useRef({
    panX: 0, panY: 0,
    scale: 1,
    centerDone: false,
    mDown: false,
    mDownX: 0, mDownY: 0,
    mDownPanX: 0, mDownPanY: 0,
    moved: false
  })

  // ---- continuous animation loop ----
  useEffect(() => {
    function animate() {
      dashOffsetRef.current = (dashOffsetRef.current + 0.8) % 200
      drawRef.current?.()
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // ---- resolve effective node position (dragPos overrides computed layout) ----
  function nodePos(n) {
    const p = dragPos.current[n.id]
    return p ? { x: p.x, y: p.y } : { x: n.x, y: n.y }
  }

  // ---- build a node-by-id map from the current nodes array ----
  function buildNodeMap() {
    const m = {}
    for (const n of nodes) m[n.id] = n
    return m
  }

  // ---- draw ----
  function draw() {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    const w = cvs.width, h = cvs.height
    const s = state.current

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.setTransform(s.scale, 0, 0, s.scale, s.panX, s.panY)

    // auto‑center once (before scale is applied to pan)
    if (!s.centerDone && nodes.length > 0) {
      const xs = nodes.map(n => nodePos(n).x)
      const ys = nodes.map(n => nodePos(n).y)
      const maxX = Math.max(...xs) + NODE_W
      const maxY = Math.max(...ys) + NODE_H
      const cx = (Math.min(...xs) + maxX) / 2
      const cy = (Math.min(...ys) + maxY) / 2
      s.panX = w / 2 - cx * s.scale
      s.panY = h / 2 - cy * s.scale
      ctx.setTransform(s.scale, 0, 0, s.scale, s.panX, s.panY)
      s.centerDone = true
    }

    const nodeById = buildNodeMap()

    // flowing directional edges — derive endpoints from live node positions
    const dashOff = dashOffsetRef.current
    for (const e of edges) {
      const na = nodeById[e.from]
      const nb = nodeById[e.to]
      if (!na || !nb) continue

      const pa = nodePos(na)
      const pb = nodePos(nb)
      const fx = pa.x + NODE_W, fy = pa.y + NODE_H / 2
      const tx = pb.x, ty = pb.y + NODE_H / 2

      // glowing trajectory (static faint trace)
      ctx.beginPath()
      ctx.setLineDash([])
      ctx.strokeStyle = 'rgba(253, 203, 110, 0.08)'
      ctx.lineWidth = 3
      ctx.moveTo(fx, fy)
      const cpY = (ty - fy) * 0.3
      ctx.bezierCurveTo(fx, fy + cpY, tx, ty - cpY, tx, ty)
      ctx.stroke()

      // flowing dashes (animated)
      ctx.beginPath()
      ctx.setLineDash([4, 10])
      ctx.lineDashOffset = -dashOff
      ctx.strokeStyle = 'rgba(253, 203, 110, 0.65)'
      ctx.lineWidth = 1.8
      ctx.moveTo(fx, fy)
      ctx.bezierCurveTo(fx, fy + cpY, tx, ty - cpY, tx, ty)
      ctx.stroke()
      ctx.setLineDash([])

      // arrowhead
      const angle = Math.atan2(ty - fy, tx - fx)
      const aLen = 8
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx - aLen * Math.cos(angle - 0.4), ty - aLen * Math.sin(angle - 0.4))
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx - aLen * Math.cos(angle + 0.4), ty - aLen * Math.sin(angle + 0.4))
      ctx.strokeStyle = 'rgba(253, 203, 110, 0.7)'
      ctx.lineWidth = 1.8
      ctx.stroke()
    }

    // nodes
    const COLORS = document.documentElement.getAttribute('data-theme') === 'light' ? LIGHT : DARK
    for (const n of nodes) {
      const pos = nodePos(n)
      const { x, y } = pos
      const learned = learnedIds.includes(n.id)
      let c
      if (n.hasChildren) {
        c = learned ? COLORS.folderLearned : COLORS.folder
      } else {
        c = learned ? COLORS.learned : COLORS.available
      }

      ctx.beginPath()
      ctx.roundRect(x, y, NODE_W, NODE_H, 8)
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
      ctx.fillText(n.title, x + NODE_W / 2, y + 22)

      // Summary (truncated)
      const summary = truncate(n.summary, 15)
      ctx.fillStyle = c.dim
      ctx.font = '10px -apple-system, "PingFang SC", sans-serif'
      ctx.fillText(summary, x + NODE_W / 2, y + 48)

      if (learned) {
        ctx.fillStyle = '#00b894'
        ctx.font = 'bold 14px sans-serif'
        ctx.fillText('✓', x + NODE_W - 20, y + 22)
      }

      // Folder indicator for nodes with children
      if (n.hasChildren) {
        ctx.font = '11px sans-serif'
        ctx.fillText('📂', x + 12, y + 22)
      }
    }
    ctx.restore()
  }

  drawRef.current = draw

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
  }, [])

  // redraw when data changes
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const parent = cvs.parentElement
    cvs.width = parent.clientWidth
    cvs.height = parent.clientHeight
    draw()
  }, [nodes, edges, learnedIds])

  // redraw when theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const cvs = canvasRef.current
      if (!cvs) return
      drawRef.current?.()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  // mouse events (drag nodes + pan + zoom + click)
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const s = state.current

    /** Convert client coords → canvas (world) coords */
    function clientToWorld(cx, cy) {
      const rect = cvs.getBoundingClientRect()
      return {
        x: (cx - rect.left - s.panX) / s.scale,
        y: (cy - rect.top - s.panY) / s.scale
      }
    }

    /** Hit-test a node at world coords. Returns node or null. */
    function hitTest(wx, wy) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i]
        const p = dragPos.current[n.id] || n
        if (wx >= p.x && wx <= p.x + NODE_W && wy >= p.y && wy <= p.y + NODE_H) {
          return n
        }
      }
      return null
    }

    function onmousedown(e) {
      const w = clientToWorld(e.clientX, e.clientY)
      const hit = hitTest(w.x, w.y)

      if (hit) {
        // Start potential node drag (might be a click)
        const p = dragPos.current[hit.id] || hit
        dragging.current = {
          id: hit.id,
          grabX: w.x - p.x,
          grabY: w.y - p.y,
          mouseX: e.clientX,
          mouseY: e.clientY,
          dragging: false
        }
        return
      }

      // No node hit → start pan
      s.mDown = true
      s.moved = false
      s.mDownX = e.clientX
      s.mDownY = e.clientY
      s.mDownPanX = s.panX
      s.mDownPanY = s.panY
    }

    function onmousemove(e) {
      // Node dragging
      if (dragging.current) {
        const d = dragging.current
        // Only start visual drag after cursor moves > 4px (to preserve clicks)
        if (!d.dragging) {
          const dx = e.clientX - d.mouseX
          const dy = e.clientY - d.mouseY
          if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) return
          d.dragging = true
        }
        const w = clientToWorld(e.clientX, e.clientY)
        dragPos.current[d.id] = { x: w.x - d.grabX, y: w.y - d.grabY }
        draw()
        return
      }

      // Panning
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
      // Node drag/click end
      if (dragging.current) {
        if (!dragging.current.dragging) {
          // Mouse never moved enough — it's a click, not a drag
          onNodeClick?.(dragging.current.id, e)
        }
        dragging.current = null
        return
      }

      // Pan click
      if (!s.moved && s.mDown) {
        const w = clientToWorld(e.clientX, e.clientY)
        const hit = hitTest(w.x, w.y)
        if (hit) {
          onNodeClick?.(hit.id, e)
        }
      }
      s.mDown = false
      s.moved = false
    }

    function onwheel(e) {
      e.preventDefault()
      const rect = cvs.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const oldScale = s.scale
      const delta = -e.deltaY * 0.001
      s.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s.scale + delta))

      // Zoom toward cursor
      s.panX = mx - (mx - s.panX) * (s.scale / oldScale)
      s.panY = my - (my - s.panY) * (s.scale / oldScale)

      draw()
    }

    cvs.addEventListener('mousedown', onmousedown)
    window.addEventListener('mousemove', onmousemove)
    window.addEventListener('mouseup', onmouseup)
    cvs.addEventListener('wheel', onwheel, { passive: false })

    return () => {
      cvs.removeEventListener('mousedown', onmousedown)
      window.removeEventListener('mousemove', onmousemove)
      window.removeEventListener('mouseup', onmouseup)
      cvs.removeEventListener('wheel', onwheel)
    }
  }, [nodes, edges, onNodeClick])

  return <canvas ref={canvasRef} className="skill-tree-canvas" />
}
