import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { knowledgeMap } from '../data/index.js'
import KnowledgeCard from '../components/KnowledgeCard.jsx'

function loadLearnedIds() {
  try {
    const raw = localStorage.getItem('life-courses-learned')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveLearnedIds(ids) {
  localStorage.setItem('life-courses-learned', JSON.stringify(ids))
}

export default function DetailView() {
  const { knowledgeId } = useParams()
  const navigate = useNavigate()
  const [learnedIds, setLearnedIds] = useState(loadLearnedIds)
  const [currentId, setCurrentId] = useState(knowledgeId)

  useEffect(() => {
    setCurrentId(knowledgeId)
  }, [knowledgeId])

  useEffect(() => {
    saveLearnedIds(learnedIds)
  }, [learnedIds])

  const knowledge = knowledgeMap[currentId]

  const handleNavigate = (id) => {
    setCurrentId(id)
    window.scrollTo(0, 0)
  }

  if (!knowledge) {
    return (
      <div className="detail-view">
        <div style={{ textAlign: 'center', paddingTop: '80px' }}>
          <h2 style={{ color: 'var(--color-text-heading)', marginBottom: 16 }}>
            未找到该知识条目
          </h2>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-view">
      <button
        className="detail-back"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 20 }}
      >
        ← 返回
      </button>
      <KnowledgeCard
        knowledge={knowledge}
        learnedIds={learnedIds}
        onMarkLearned={(id) => {
          setLearnedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
          )
        }}
        onNavigate={handleNavigate}
      />
    </div>
  )
}
