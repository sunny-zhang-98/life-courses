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

  // Calculate positions
  const sortedLayers = Object.keys(layers).sort((a, b) => Number(a) - Number(b))
  const totalLayers = sortedLayers.length
  const totalWidth = (totalLayers - 1) * LAYER_GAP_X
  const offsetX = -totalWidth / 2

  for (const lStr of sortedLayers) {
    const l = Number(lStr)
    const group = layers[l]
    const totalHeight = group.length * NODE_H + (group.length - 1) * NODE_GAP_Y
    const startY = -totalHeight / 2

    for (let i = 0; i < group.length; i++) {
      const n = group[i]
      n.x = offsetX + l * LAYER_GAP_X
      n.y = startY + i * (NODE_H + NODE_GAP_Y)
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
