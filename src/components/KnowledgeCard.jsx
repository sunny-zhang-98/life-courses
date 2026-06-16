import { branches, knowledgeMap, getConnectedKnowledge, getChildren, getParent, getNext, getPrev } from '../data/index.js'

const RESOURCE_ICONS = {
  book: '📖',
  video: '🎬',
  course: '🎓',
  article: '📝',
  website: '🌐'
}

export default function KnowledgeCard({ knowledge, learnedIds, onMarkLearned, onNavigate, onEnterFolder }) {
  if (!knowledge) return null

  const isLearned = learnedIds?.includes(knowledge.id)
  const knowledgeBranches = (knowledge.branchIds || [])
    .map(id => branches.find(b => b.id === id))
    .filter(Boolean)

  const { outgoing, incoming } = getConnectedKnowledge(knowledge.id)
  const children = getChildren(knowledge.id)
  const parent = getParent(knowledge.id)
  const nextSteps = getNext(knowledge.id)
  const prevSteps = getPrev(knowledge.id)

  const content = (
    <div className="knowledge-detail">
      <div className="detail-header">
        <h1 className="detail-title">{knowledge.title}</h1>
        <p className="detail-summary">{knowledge.summary}</p>
        <div className="detail-branch-tags">
          {knowledgeBranches.map(b => (
            <span key={b.id} className="branch-tag">{b.icon} {b.name}</span>
          ))}
        </div>
      </div>

      {/* Mark learned button */}
      {onMarkLearned && (
        <div style={{ marginBottom: 24 }}>
          <button
            className={`learn-btn ${isLearned ? 'learned' : 'mark-learned'}`}
            onClick={() => onMarkLearned(knowledge.id)}
          >
            {isLearned ? '✓ 已学' : '标记为已学'}
          </button>
        </div>
      )}

      {/* 前置知识 */}
      {prevSteps.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-dim)', marginBottom: 6 }}>
            前置知识：
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {prevSteps.map(k => (
              <button key={k.id} onClick={() => onNavigate?.(k.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 12px', fontSize: '0.85rem',
                background: 'rgba(108, 92, 231, 0.1)',
                border: '1px solid rgba(108, 92, 231, 0.2)', borderRadius: 16,
                color: 'var(--color-primary-light)', cursor: 'pointer'
              }}>
                ← {k.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 下一步 */}
      {nextSteps.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-dim)', marginBottom: 6 }}>
            下一步学习：
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {nextSteps.map(k => (
              <button key={k.id} onClick={() => onNavigate?.(k.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 14px', fontSize: '0.9rem',
                background: 'rgba(253, 203, 110, 0.12)',
                border: '1px solid rgba(253, 203, 110, 0.3)', borderRadius: 8,
                color: 'var(--color-yellow)', cursor: 'pointer', fontWeight: 500
              }}>
                {k.title} →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 展开子节点 */}
      {onEnterFolder && children.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => onEnterFolder(knowledge.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              fontSize: '0.95rem',
              background: 'rgba(108, 92, 231, 0.15)',
              border: '1px solid rgba(108, 92, 231, 0.3)',
              borderRadius: 8,
              color: 'var(--color-primary-light)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            📂 展开子节点（{children.length}项） →
          </button>
        </div>
      )}

      {/* 两栏网格 */}
      <div className="detail-grid">

      {/* 错误案例 */}
      {knowledge.commonMistakes?.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">
            <span className="detail-section-icon">❌</span>
            错误案例
          </div>
          <ul className="detail-list">
            {knowledge.commonMistakes.map((item, i) => (
              <li key={i} className="mistake">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 心路历程 */}
      {knowledge.journey?.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">
            <span className="detail-section-icon">🧠</span>
            心路历程
          </div>
          <ul className="detail-list">
            {knowledge.journey.map((item, i) => (
              <li key={i} className="journey">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 知识 */}
      <div className="detail-section">
        <div className="detail-section-title">
          <span className="detail-section-icon">📖</span>
          知识
        </div>
        <div className="knowledge-core">{knowledge.knowledge?.core}</div>
        {knowledge.knowledge?.details && (
          <div className="knowledge-details">{knowledge.knowledge.details}</div>
        )}
      </div>

      {/* 资源索引 */}
      {knowledge.resources?.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">
            <span className="detail-section-icon">🔗</span>
            资源索引
          </div>
          <div className="resource-list">
            {knowledge.resources.map((r, i) => (
              <div key={i} className="resource-item">
                <span className="resource-type">
                  {RESOURCE_ICONS[r.type] || '🔗'} {r.type}
                </span>
                <span className="resource-title">{r.title}</span>
                {r.url && r.url !== '...' && (
                  <a href={r.url} target="_blank" rel="noopener" className="resource-url">
                    去学习 →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 自测标准 */}
      {knowledge.selfTest?.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">
            <span className="detail-section-icon">✅</span>
            自测标准
          </div>
          <ul className="detail-list">
            {knowledge.selfTest.map((item, i) => (
              <li key={i} className="test">{item}</li>
            ))}
          </ul>
        </div>
      )}

      </div>{/* end detail-grid */}

      {/* 知识网络 — 层级 + 连接 */}
      {(parent || children.length > 0 || outgoing.length > 0 || incoming.length > 0) && (
        <div className="detail-section">
          <div className="detail-section-title">
            <span className="detail-section-icon">🕸️</span>
            知识网络
          </div>

          {/* 上级知识 */}
          {parent && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: '0.82rem',
                color: 'var(--color-text-dim)',
                marginBottom: 6
              }}>
                上级知识：
              </div>
              <button
                onClick={() => onNavigate?.(parent.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 12px',
                  fontSize: '0.85rem',
                  background: 'rgba(108, 92, 231, 0.12)',
                  border: '1px solid rgba(108, 92, 231, 0.25)',
                  borderRadius: 16,
                  color: 'var(--color-primary-light)',
                  cursor: 'pointer'
                }}
              >
                ← {parent.title}
              </button>
            </div>
          )}

          {/* 下级知识（子级关系 + 顺序） */}
          {children.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: '0.82rem',
                color: 'var(--color-text-dim)',
                marginBottom: 6
              }}>
                下级知识（{children.length}项，按推荐顺序）：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {children.map((k, i) => (
                  <button
                    key={k.id}
                    onClick={() => onNavigate?.(k.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 12px',
                      fontSize: '0.85rem',
                      background: 'rgba(0, 184, 148, 0.1)',
                      border: '1px solid rgba(0, 184, 148, 0.25)',
                      borderRadius: 16,
                      color: 'var(--color-green)',
                      cursor: 'pointer'
                    }}
                  >
                    {i + 1}. {k.title} →
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 弱连接 */}
          {outgoing.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: '0.82rem',
                color: 'var(--color-text-dim)',
                marginBottom: 6
              }}>
                相关知识：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {outgoing.map(k => (
                  <button
                    key={k.id}
                    onClick={() => onNavigate?.(k.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 12px',
                      fontSize: '0.85rem',
                      background: 'rgba(108, 92, 231, 0.12)',
                      border: '1px solid rgba(108, 92, 231, 0.25)',
                      borderRadius: 16,
                      color: 'var(--color-primary-light)',
                      cursor: 'pointer'
                    }}
                  >
                    {k.title} →
                  </button>
                ))}
              </div>
            </div>
          )}

          {incoming.length > 0 && (
            <div>
              <div style={{
                fontSize: '0.82rem',
                color: 'var(--color-text-dim)',
                marginBottom: 6
              }}>
                被以下知识引用：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {incoming.map(k => (
                  <button
                    key={k.id}
                    onClick={() => onNavigate?.(k.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 12px',
                      fontSize: '0.85rem',
                      background: 'rgba(253, 121, 168, 0.1)',
                      border: '1px solid rgba(253, 121, 168, 0.2)',
                      borderRadius: 16,
                      color: 'var(--color-accent)',
                      cursor: 'pointer'
                    }}
                  >
                    ← {k.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return content
}
