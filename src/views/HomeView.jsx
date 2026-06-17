import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  knowledgeList, knowledgeMap, getChildren, getParent,
  relationList, setActiveRelationId, getRelationLinks
} from '../data/index.js'
import { computeLayout } from '../components/TreeLayout.js'
import SkillTree from '../components/SkillTree.jsx'
import BottomToolbar from '../components/BottomToolbar.jsx'

function loadLearned() {
  try { return JSON.parse(localStorage.getItem('life-courses-learned') || '[]') }
  catch { return [] }
}
function saveLearned(ids) {
  localStorage.setItem('life-courses-learned', JSON.stringify(ids))
}

function loadActiveRelation() {
  try { return localStorage.getItem('life-courses-relation') || '' }
  catch { return '' }
}
function saveActiveRelation(id) {
  if (id) localStorage.setItem('life-courses-relation', id)
  else localStorage.removeItem('life-courses-relation')
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
  return chain
}

/** Get the list of children for a given node, or root nodes if null */
function getChildrenFor(nodeId) {
  const items = nodeId ? getChildren(nodeId) : getRootNodes()
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const folderParam = searchParams.get('folder') || null

  const [currentId, setCurrentId] = useState(folderParam)
  const [learnedIds, setLearnedIds] = useState(loadLearned)
  const [activeRelId, setActiveRelId] = useState(() => {
    const saved = loadActiveRelation()
    if (saved && relationList.some(r => r.id === saved)) return saved
    return relationList.find(r => r.default)?.id || (relationList[0]?.id || null)
  })

  // Sync folder from URL on popstate
  useEffect(() => {
    setCurrentId(folderParam)
  }, [folderParam])

  useEffect(() => { saveLearned(learnedIds) }, [learnedIds])
  useEffect(() => { saveActiveRelation(activeRelId) }, [activeRelId])

  useEffect(() => {
    setActiveRelationId(activeRelId)
  }, [activeRelId])

  const siblings = getChildrenFor(currentId)
  const currentEntry = currentId ? knowledgeMap[currentId] : null
  const pathChain = currentId ? getPathChain(currentId) : []

  const nextMap = getRelationLinks(activeRelId)
  const { nodes, edges } = computeLayout(siblings.map(k => ({
    ...k,
    learned: learnedIds.includes(k.id)
  })), nextMap)

  const handleNodeClick = useCallback((id, e) => {
    if (e?.ctrlKey || e?.metaKey) {
      // Ctrl+Click — enter folder (navigate to this node's children view)
      const entry = knowledgeMap[id]
      if (entry && (entry.children || []).length > 0) {
        navigate(`/?folder=${id}`)
      }
      return
    }
    // Normal click — navigate to detail page
    const folder = currentId || ''
    navigate(`/knowledge/${id}?folder=${folder}`)
  }, [currentId, navigate])

  const handleBreadcrumbClick = useCallback((id) => {
    if (id === currentId && id !== null) return
    if (id) {
      navigate(`/?folder=${id}`)
    } else {
      navigate('/')
    }
  }, [currentId, navigate])

  const handleMarkLearned = useCallback((id) => {
    setLearnedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }, [])

  const handleRelationChange = useCallback((relId) => {
    setActiveRelId(relId)
  }, [])

  // Esc → go up one folder level
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (currentId) {
          const parent = getParent(currentId)
          if (parent) {
            navigate(`/?folder=${parent.id}`)
          } else {
            navigate('/')
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentId, navigate])

  const allCount = knowledgeList.length

  return (
    <div className="stage-view">
      {/* Breadcrumb + Title bar */}
      <div className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            onClick={() => navigate('/')}
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
                onClick={() => handleBreadcrumbClick(id)}
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

        {/* Relation selector + progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {relationList.length > 1 && (
            <div className="relation-selector">
              <select
                value={activeRelId}
                onChange={e => handleRelationChange(e.target.value)}
                className="relation-select"
                title="切换学习路径"
              >
                {relationList.map(rel => (
                  <option key={rel.id} value={rel.id}>
                    {rel.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>
            {learnedIds.length} / {allCount} 已学
          </div>
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

      {/* Bottom toolbar */}
      <BottomToolbar />
    </div>
  )
}
