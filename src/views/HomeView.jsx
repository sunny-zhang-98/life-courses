import { useState, useEffect, useCallback } from 'react'
import { knowledgeList, knowledgeMap, getChildren, getParent } from '../data/index.js'
import { computeLayout } from '../components/TreeLayout.js'
import SkillTree from '../components/SkillTree.jsx'
import KnowledgeCard from '../components/KnowledgeCard.jsx'

function loadLearned() {
  try { return JSON.parse(localStorage.getItem('life-courses-learned') || '[]') }
  catch { return [] }
}
function saveLearned(ids) {
  localStorage.setItem('life-courses-learned', JSON.stringify(ids))
}

/** Walk up parent chain to build breadcrumb path */
function getPathChain(id) {
  const chain = []
  let cur = id
  while (cur) {
    chain.unshift(cur)
    const p = getParent(cur)
    cur = p ? p.id : null
  }
  return chain // [root, ..., current]
}

/** Get the list of children for a given node, or root nodes if null */
function getChildrenFor(nodeId) {
  const items = nodeId ? getChildren(nodeId) : getRootNodes()
  // Sort by parent's children array order, or by original list order
  if (nodeId && knowledgeMap[nodeId]) {
    const order = knowledgeMap[nodeId].children || []
    items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }
  return items
}

function getRootNodes() {
  return knowledgeList.filter(k => !getParent(k.id))
}

export default function HomeView() {
  const [currentId, setCurrentId] = useState(null) // null = root level
  const [selectedId, setSelectedId] = useState(null) // detail panel
  const [learnedIds, setLearnedIds] = useState(loadLearned)

  useEffect(() => { saveLearned(learnedIds) }, [learnedIds])

  const siblings = getChildrenFor(currentId)
  const currentEntry = currentId ? knowledgeMap[currentId] : null
  const pathChain = currentId ? getPathChain(currentId) : []

  const { nodes, edges } = computeLayout(siblings.map(k => ({
    ...k,
    learned: learnedIds.includes(k.id)
  })))

  const handleNodeClick = useCallback((id) => {
    // Always open detail panel first
    setSelectedId(id)
  }, [])

  const handleNavigate = useCallback((id) => {
    const entry = knowledgeMap[id]
    if (entry && (entry.children || []).length > 0) {
      setCurrentId(id)
      setSelectedId(null)
    } else {
      setSelectedId(id)
    }
  }, [])

  const handleMarkLearned = useCallback((id) => {
    setLearnedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }, [])

  const selectedKnowledge = selectedId ? knowledgeMap[selectedId] : null

  // Enter key → enter folder when detail panel is open
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && selectedId) {
        const entry = knowledgeMap[selectedId]
        if (entry && (entry.children || []).length > 0) {
          e.preventDefault()
          setCurrentId(selectedId)
          setSelectedId(null)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId])

  const rootCount = getRootNodes().length
  const allCount = knowledgeList.length

  return (
    <div className="stage-view">
      {/* Breadcrumb + Title bar */}
      <div className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            onClick={() => { setCurrentId(null); setSelectedId(null) }}
            style={{
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: currentId ? 400 : 700,
              color: currentId ? 'var(--color-text-dim)' : 'var(--color-text-heading)'
            }}
          >
            🎓 全部课程
          </span>
          {pathChain.map((id, i) => (
            <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--color-text-dim)' }}>/</span>
              <span
                onClick={() => { setCurrentId(id); setSelectedId(null) }}
                style={{
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: i === pathChain.length - 1 ? 600 : 400,
                  color: i === pathChain.length - 1
                    ? 'var(--color-text-heading)'
                    : 'var(--color-text-dim)'
                }}
              >
                {knowledgeMap[id]?.title || id}
              </span>
            </span>
          ))}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
          {learnedIds.length} / {allCount} 已学
        </div>
      </div>

      {/* Canvas area */}
      <div className="skill-tree-container">
        <SkillTree
          nodes={nodes}
          edges={edges}
          learnedIds={learnedIds}
          onNodeClick={handleNodeClick}
        />

        {!siblings.length && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, color: 'var(--color-text-dim)'
          }}>
            <span style={{ fontSize: '2rem' }}>📂</span>
            <span>此节点下暂无子知识</span>
          </div>
        )}
      </div>

      {/* Detail panel overlay */}
      {selectedKnowledge && (
        <div className="detail-panel-overlay" onClick={() => setSelectedId(null)}>
          <div className="detail-panel" onClick={e => e.stopPropagation()}>
            <button className="detail-panel-close" onClick={() => setSelectedId(null)}>✕</button>
            <KnowledgeCard
              knowledge={selectedKnowledge}
              learnedIds={learnedIds}
              onMarkLearned={handleMarkLearned}
              onNavigate={handleNavigate}
              onEnterFolder={(id) => { setCurrentId(id); setSelectedId(null) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
