import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { knowledgeMap } from '../data/index.js'
import KnowledgeCard from '../components/KnowledgeCard.jsx'
import BottomToolbar from '../components/BottomToolbar.jsx'

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
  const [searchParams] = useSearchParams()
  const folder = searchParams.get('folder') || ''
  const [learnedIds, setLearnedIds] = useState(loadLearnedIds)
  const [currentId, setCurrentId] = useState(knowledgeId)

  useEffect(() => {
    setCurrentId(knowledgeId)
  }, [knowledgeId])

  useEffect(() => {
    saveLearnedIds(learnedIds)
  }, [learnedIds])

  const handleBack = () => {
    if (folder) {
      navigate(`/?folder=${folder}`)
    } else {
      navigate('/')
    }
  }

  const handleNavigate = (id) => {
    navigate(`/knowledge/${id}?folder=${folder}`)
  }

  const knowledge = knowledgeMap[currentId]

  // Esc to go back
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        handleBack()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [folder])

  if (!knowledge) {
    return (
      <div className="detail-view">
        <div className="detail-view-body">
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
        <BottomToolbar />
      </div>
    )
  }

  return (
    <div className="detail-view">
      <div className="detail-view-top">
        <button className="detail-back" onClick={handleBack}>← 返回 <span className="esc-hint">Esc</span></button>
      </div>
      <div className="detail-view-body">
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
      <BottomToolbar />
    </div>
  )
}
