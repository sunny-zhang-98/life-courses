/**
 * 检测 relation 文件中的连接问题
 *
 * 用法: node scripts/check-relations.mjs
 *
 * 检测项:
 *   1. ❌ 引用不存在的知识 ID
 *   2. 🔁 重复连接
 *   3. 🎯 跳过中间节点的冗余连接（如 reading → writing-basics，当 reading → note-taking → writing-basics 已存在）
 *   4. 🔄 自引用 (A → A)
 *   5. ⚠️ 未使用的节点（不在任何 relation 中出现）
 */

import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../src/data')

// ── Load all knowledge IDs ──
const knowledgeDir = resolve(DATA_DIR, 'knowledge')
const knowledgeFiles = readdirSync(knowledgeDir).filter(f => f.endsWith('.json'))
const knowledgeIds = new Set()

for (const file of knowledgeFiles) {
  const data = JSON.parse(readFileSync(resolve(knowledgeDir, file), 'utf-8'))
  knowledgeIds.add(data.id)
}

// ── Helper: build adjacency ──
function buildGraph(links) {
  const adj = {}
  for (const { from, to } of links) {
    if (!adj[from]) adj[from] = []
    adj[from].push(to)
  }
  return { adj }
}

// ── BFS shortest path length (from → to, maxDepth limit) ──
function shortestPathLen(adj, from, to, maxDepth) {
  if (from === to) return 0
  const visited = new Set([from])
  const queue = [[from, 0]]
  while (queue.length) {
    const [node, depth] = queue.shift()
    if (depth >= maxDepth) continue
    const neighbors = adj[node] || []
    for (const n of neighbors) {
      if (n === to) return depth + 1
      if (!visited.has(n)) {
        visited.add(n)
        queue.push([n, depth + 1])
      }
    }
  }
  return Infinity
}

// ── Check one relation file ──
function checkRelation(filePath, relName) {
  const rel = JSON.parse(readFileSync(filePath, 'utf-8'))
  const links = rel.links || []
  const issues = []
  const skipFindings = []

  // Track seen pairs for duplicate detection
  const seen = new Set()

  for (let i = 0; i < links.length; i++) {
    const { from, to } = links[i]
    const pairKey = `${from} → ${to}`

    // 1. Invalid IDs
    if (!knowledgeIds.has(from)) {
      issues.push(`❌ 不存在的来源 ID "${from}"（条目 ${i + 1}: ${pairKey}）`)
    }
    if (!knowledgeIds.has(to)) {
      issues.push(`❌ 不存在的目标 ID "${to}"（条目 ${i + 1}: ${pairKey}）`)
    }

    // 2. Self-reference
    if (from === to && knowledgeIds.has(from)) {
      issues.push(`🔄 自引用: ${pairKey}`)
    }

    // 3. Duplicate
    if (seen.has(pairKey)) {
      issues.push(`🔁 重复连接: ${pairKey}`)
    }
    seen.add(pairKey)
  }

  // 4. Redundant skip: A → C 存在但 A → ... → C 也能到达（中间有节点）
  const validLinks = links.filter(l => knowledgeIds.has(l.from) && knowledgeIds.has(l.to) && l.from !== l.to)

  for (const { from, to } of validLinks) {
    if (from === to) continue

    // Build graph WITHOUT this specific edge, to find alternate paths
    const otherLinks = links.filter(l => !(l.from === from && l.to === to))
    const { adj: altAdj } = buildGraph(otherLinks)

    const altPathLen = shortestPathLen(altAdj, from, to, 5)
    if (altPathLen !== Infinity) {
      // Find all intermediate neighbors that lead to `to`
      const intermediates = (altAdj[from] || []).filter(b => {
        const subPathLen = shortestPathLen(altAdj, b, to, 4)
        return subPathLen !== Infinity
      })
      skipFindings.push(`  ${from} → ${to} 可经由 ${intermediates.join('、')} 到达（路径长度 ${altPathLen}）`)
    }
  }

  // 5. Unused nodes (IDs that have no incoming or outgoing links in this relation)
  const linkedIds = new Set()
  for (const { from, to } of links) {
    linkedIds.add(from)
    linkedIds.add(to)
  }
  const unused = [...knowledgeIds].filter(id => !linkedIds.has(id))
  if (unused.length > 0 && unused.length < knowledgeIds.size) {
    issues.push(`⚠️  以下节点未在此 relation 中出现（无入边/出边）: ${unused.join('、')}`)
  }

  return { issues, skipFindings }
}

// ── Main ──
const relationsDir = resolve(DATA_DIR, 'relations')
const relFiles = readdirSync(relationsDir).filter(f => f.endsWith('.json'))

console.log(`知识条目总数: ${knowledgeIds.size}\n`)

for (const file of relFiles) {
  const filePath = resolve(relationsDir, file)
  console.log(`══════ ${file} ══════`)

  const { issues, skipFindings } = checkRelation(filePath)

  if (issues.length === 0 && skipFindings.length === 0) {
    console.log('  ✅ 未发现问题\n')
    continue
  }

  if (issues.length > 0) {
    console.log('')
    for (const issue of issues) {
      console.log(issue)
    }
  }

  if (skipFindings.length > 0) {
    console.log(`\n🎯 可能冗余的直连（${skipFindings.length} 条）:`)
    for (const f of skipFindings) {
      console.log(f)
    }
  }

  console.log('')
}
