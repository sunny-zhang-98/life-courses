/**
 * Layered graph layout for sibling knowledge nodes.
 * Uses `nextMap` (from relation files) to arrange nodes into layers,
 * showing branching (left to right) and convergence.
 *
 * @param {Array} knowledgeList - list of knowledge entries for the current level
 * @param {Object} nextMap - { [fromId]: [toId, ...] } directional links from active relation
 */

const NODE_W = 160
const NODE_H = 72
const LAYER_GAP_X = 210 // horizontal gap between layers
const NODE_GAP_Y = 18   // vertical gap between nodes in the same layer

export function computeLayout(knowledgeList, nextMap = {}) {
  if (!knowledgeList.length) return { nodes: [], edges: [] }

  const visibleIds = new Set()

  // Build node objects with position data
  const nodeMap = {}
  const nodes = knowledgeList.map((k) => {
    visibleIds.add(k.id)
    const n = {
      id: k.id,
      title: k.title,
      summary: k.summary,
      width: NODE_W,
      height: NODE_H,
      children: k.children || [],
      learned: k.learned || false,
      hasChildren: (k.children || []).length > 0,
      // temporary positions, will be overwritten
      x: 0, y: 0,
    }
    nodeMap[k.id] = n
    return n
  })

  // Build visible `next` and `prev` adjacency from the external nextMap
  const visibleNextMap = {} // id -> [target ids visible in this level]
  const visiblePrevMap = {} // id -> [source ids visible in this level]

  for (const n of nodes) {
    const targets = (nextMap[n.id] || []).filter(tid => visibleIds.has(tid) && tid !== n.id)
    if (targets.length > 0) {
      visibleNextMap[n.id] = targets
      for (const t of targets) {
        if (!visiblePrevMap[t]) visiblePrevMap[t] = []
        visiblePrevMap[t].push(n.id)
      }
    }
  }

  // Assign layers via longest-path algorithm.
  // Unlike BFS (which visits each node once and may assign C to layer 1
  // from A→C even though A→B→C puts C at layer 2), this iteratively
  // propagates forward until every node reaches its maximum depth.
  const layer = {}

  // Initialize sources at layer 0
  for (const n of nodes) {
    if (!visiblePrevMap[n.id] || visiblePrevMap[n.id].length === 0) {
      layer[n.id] = 0
    }
  }

  // Any remaining node (no paths from sources) starts at 0 too
  for (const n of nodes) {
    if (layer[n.id] === undefined) layer[n.id] = 0
  }

  // Iteratively push nodes forward:
  //   if a predecessor is at layer L, successor must be at least L+1
  // Repeats until stable (all chains at their longest length)
  let changed = true
  let iterations = 0
  while (changed && iterations < 50) {
    changed = false
    for (const n of nodes) {
      const targets = visibleNextMap[n.id] || []
      for (const t of targets) {
        const candidate = layer[n.id] + 1
        if (candidate > layer[t]) {
          layer[t] = candidate
          changed = true
        }
      }
    }
    iterations++
  }

  // Group nodes by layer
  const layers = {}
  for (const n of nodes) {
    const l = layer[n.id]
    if (!layers[l]) layers[l] = []
    layers[l].push(n)
  }

  // Order nodes within each layer: prefer those with outgoing edges first
  for (const l in layers) {
    layers[l].sort((a, b) => {
      const aNext = (visibleNextMap[a.id] || []).length
      const bNext = (visibleNextMap[b.id] || []).length
      if (aNext !== bNext) return bNext - aNext // more outgoing edges first
      return a.id.localeCompare(b.id)
    })
  }

  // --- Crossing minimization (barycenter heuristic) ---
  const sortedKeys = Object.keys(layers).sort((a, b) => Number(a) - Number(b))
  const N_LAYERS = sortedKeys.length
  if (N_LAYERS > 1) {
    const layerArr = sortedKeys.map(k => [...layers[k]])

    for (let pass = 0; pass < 8; pass++) {
      let moved = 0

      // Left-to-right: reorder each layer by predecessor positions
      for (let i = 1; i < N_LAYERS; i++) {
        const prevIdx = {}
        layerArr[i - 1].forEach((n, idx) => { prevIdx[n.id] = idx })
        const old = layerArr[i].map(n => n.id)

        layerArr[i].sort((a, b) => {
          const aPred = visiblePrevMap[a.id] || []
          const bPred = visiblePrevMap[b.id] || []
          const aBary = aPred.reduce((s, pid) => s + (prevIdx[pid] ?? -1), 0) / (aPred.length || 1)
          const bBary = bPred.reduce((s, pid) => s + (prevIdx[pid] ?? -1), 0) / (bPred.length || 1)
          return aBary - bBary
        })

        for (let j = 0; j < layerArr[i].length; j++) {
          if (layerArr[i][j].id !== old[j]) moved++
        }
      }

      // Right-to-left: reorder each layer by successor positions
      for (let i = N_LAYERS - 2; i >= 0; i--) {
        const nextIdx = {}
        layerArr[i + 1].forEach((n, idx) => { nextIdx[n.id] = idx })
        const old = layerArr[i].map(n => n.id)

        layerArr[i].sort((a, b) => {
          const aNext = visibleNextMap[a.id] || []
          const bNext = visibleNextMap[b.id] || []
          const aBary = aNext.reduce((s, nid) => s + (nextIdx[nid] ?? -1), 0) / (aNext.length || 1)
          const bBary = bNext.reduce((s, nid) => s + (nextIdx[nid] ?? -1), 0) / (bNext.length || 1)
          return aBary - bBary
        })

        for (let j = 0; j < layerArr[i].length; j++) {
          if (layerArr[i][j].id !== old[j]) moved++
        }
      }

      if (moved === 0) break
    }

    // Write back
    for (let i = 0; i < N_LAYERS; i++) {
      layers[sortedKeys[i]] = layerArr[i]
    }
  }

  // --- Find connected components for vertical grouping ---
  // Independent subgraphs get their own Y "track" with extra spacing.
  const compOf = {}
  let compCount = 0
  for (const n of nodes) {
    if (compOf[n.id] !== undefined) continue
    const queue = [n.id]
    compOf[n.id] = compCount
    while (queue.length) {
      const id = queue.shift()
      const neighbors = [...(visibleNextMap[id] || []), ...(visiblePrevMap[id] || [])]
      for (const nb of neighbors) {
        if (compOf[nb] === undefined) {
          compOf[nb] = compCount
          queue.push(nb)
        }
      }
    }
    compCount++
  }

  // Determine component priority: by first appearance in layer 0, then alphabetically
  const compInfo = Array.from({ length: compCount }, (_, i) => ({ id: i, firstPos: Infinity, firstLabel: '' }))
  const layer0Arr = layers[0]
  if (layer0Arr) {
    layer0Arr.forEach((n, idx) => {
      const ci = compOf[n.id]
      if (idx < compInfo[ci].firstPos) {
        compInfo[ci].firstPos = idx
        compInfo[ci].firstLabel = n.id
      }
    })
  }
  for (const n of nodes) {
    const ci = compOf[n.id]
    if (!compInfo[ci].firstLabel) compInfo[ci].firstLabel = n.id
  }
  compInfo.sort((a, b) => {
    if (a.firstPos !== b.firstPos) return a.firstPos - b.firstPos
    return a.firstLabel.localeCompare(b.firstLabel)
  })
  const compPriority = {}
  compInfo.forEach((c, i) => { compPriority[c.id] = i })

  // Re-sort each layer by component, preserving internal barycenter order
  if (compCount > 1) {
    const sortedLayerKeys = Object.keys(layers).sort((a, b) => Number(a) - Number(b))
    for (const lStr of sortedLayerKeys) {
      layers[lStr].sort((a, b) => compPriority[compOf[a.id]] - compPriority[compOf[b.id]])
    }
  }

  // Calculate positions — each component gets its own vertical "track"
  const sortedLayers = Object.keys(layers).sort((a, b) => Number(a) - Number(b))
  const totalLayers = sortedLayers.length
  const totalWidth = (totalLayers - 1) * LAYER_GAP_X
  const offsetX = -totalWidth / 2

  // For each component, find the max node count across all layers → track height
  const compMaxCount = Array.from({ length: compCount }, () => 0)
  for (const lStr of sortedLayers) {
    const counts = {}
    for (const n of layers[lStr]) {
      const ci = compOf[n.id]
      counts[ci] = (counts[ci] || 0) + 1
    }
    for (const ci in counts) {
      compMaxCount[ci] = Math.max(compMaxCount[ci], counts[ci])
    }
  }
  const COMPONENT_GAP = NODE_GAP_Y * 2
  // Track Y offset for each component (in priority order), accumulating vertically
  const compYBase = {} // component id → Y offset (top of its track)
  let accY = 0
  for (const info of compInfo) {
    const ci = info.id
    const maxN = compMaxCount[ci]
    const ht = maxN * NODE_H + Math.max(0, maxN - 1) * NODE_GAP_Y
    compYBase[ci] = accY
    accY += ht + COMPONENT_GAP
  }
  // Center the whole stack vertically
  const totalStackHeight = accY - COMPONENT_GAP
  const centerY = -totalStackHeight / 2

  // Position each component's nodes within its own track, per layer
  for (const lStr of sortedLayers) {
    const l = Number(lStr)
    const group = layers[l]
    // Bucket by component
    const buckets = {}
    for (const n of group) {
      const ci = compOf[n.id]
      if (!buckets[ci]) buckets[ci] = []
      buckets[ci].push(n)
    }
    for (const ciStr in buckets) {
      const ci = Number(ciStr)
      const arr = buckets[ci]
      const trackH = compMaxCount[ci] * NODE_H + Math.max(0, compMaxCount[ci] - 1) * NODE_GAP_Y
      const bandH = arr.length * NODE_H + Math.max(0, arr.length - 1) * NODE_GAP_Y
      const bandStart = centerY + compYBase[ci] + (trackH - bandH) / 2
      for (let i = 0; i < arr.length; i++) {
        arr[i].x = offsetX + l * LAYER_GAP_X
        arr[i].y = bandStart + i * (NODE_H + NODE_GAP_Y)
      }
    }
  }

  // Generate edges based on `next` relationships
  const edges = []
  const edgePair = new Set()

  for (const a of nodes) {
    const targets = visibleNextMap[a.id] || []
    for (const targetId of targets) {
      const b = nodeMap[targetId]
      if (!b) continue

      const pairKey = `${a.id}->${targetId}`
      if (edgePair.has(pairKey)) continue
      edgePair.add(pairKey)

      edges.push({
        from: a.id, to: b.id,
        type: 'next',
        fromX: a.x + NODE_W,
        fromY: a.y + NODE_H / 2,
        toX: b.x,
        toY: b.y + NODE_H / 2
      })
    }
  }

  return { nodes, edges }
}
