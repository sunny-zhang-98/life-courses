/**
 * Horizontal layout for sibling knowledge nodes.
 * Arranges nodes left-to-right in order.
 */

const NODE_W = 160
const NODE_H = 72
const NODE_GAP = 40

export function computeLayout(knowledgeList) {
  if (!knowledgeList.length) return { nodes: [], edges: [] }

  const totalW = knowledgeList.length * NODE_W + (knowledgeList.length - 1) * NODE_GAP
  const startX = -totalW / 2 + NODE_W / 2

  const nodes = knowledgeList.map((k, i) => ({
    id: k.id,
    title: k.title,
    summary: k.summary,
    x: startX + i * (NODE_W + NODE_GAP),
    y: -NODE_H / 2,
    width: NODE_W,
    height: NODE_H,
    children: k.children || [],
    learned: k.learned || false,
    hasChildren: (k.children || []).length > 0
  }))

  const edges = []
  // Order arrows between consecutive siblings
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1]
    edges.push({
      from: a.id, to: b.id,
      type: 'order',
      fromX: a.x + NODE_W,
      fromY: a.y + NODE_H / 2,
      toX: b.x,
      toY: b.y + NODE_H / 2
    })
  }

  return { nodes, edges }
}
