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
      <div className="detail-top">
      {/* ========== Header ========== */}
      <div className="detail-header">
        <h1 className="detail-title">{knowledge.title}</h1>
        <p className="detail-summary">{knowledge.summary}</p>
        <div className="detail-branch-tags">
          {knowledgeBranches.map(b => (
            <span key={b.id} className="branch-tag">{b.icon} {b.name}</span>
          ))}
        </div>
      </div>

      {/* 不学会损失什么 */}
      {knowledge.costOfIgnorance && (
        <div className="detail-why-section">
          <div className="detail-why-icon">⚠️</div>
          <div>
            <div className="detail-why-label">不学会损失什么</div>
            <div className="detail-why-text">{knowledge.costOfIgnorance}</div>
          </div>
        </div>
      )}
      </div>

      <div className="detail-layout">
        {/* ========== Sidebar ========== */}
        <aside className="detail-sidebar">

          {/* 标记已学 */}
          {onMarkLearned && (
            <div className="sidebar-block">
              <button
                className={`sidebar-learn-btn ${isLearned ? 'learned' : ''}`}
                onClick={() => onMarkLearned(knowledge.id)}
              >
                {isLearned ? '✓ 已学' : '标记为已学'}
              </button>
            </div>
          )}

          {/* 前置知识 */}
          {prevSteps.length > 0 && (
            <div className="sidebar-block">
              <div className="sidebar-label">📋 前置知识</div>
              <div className="sidebar-chips">
                {prevSteps.map(k => (
                  <button key={k.id} onClick={() => onNavigate?.(k.id)}
                    className="chip chip-prev">
                    ← {k.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 下一阶段 */}
          {nextSteps.length > 0 && (
            <div className="sidebar-block">
              <div className="sidebar-label">➡️ 下一阶段</div>
              <div className="sidebar-chips">
                {nextSteps.map(k => (
                  <button key={k.id} onClick={() => onNavigate?.(k.id)}
                    className="chip chip-next">
                    {k.title} →
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 展开子项 */}
          {onEnterFolder && children.length > 0 && (
            <div className="sidebar-block">
              <button
                onClick={() => onEnterFolder(knowledge.id)}
                className="sidebar-folder-btn"
              >
                📂 展开子项（{children.length}项） →
              </button>
            </div>
          )}

          {/* 分隔线 */}
          <div className="sidebar-divider" />

          {/* 上级知识 */}
          {parent && (
            <div className="sidebar-block">
              <div className="sidebar-label">⬆️ 上级知识</div>
              <div className="sidebar-chips">
                <button onClick={() => onNavigate?.(parent.id)}
                  className="chip chip-parent">
                  ← {parent.title}
                </button>
              </div>
            </div>
          )}

          {/* 下级知识 */}
          {children.length > 0 && (
            <div className="sidebar-block">
              <div className="sidebar-label">⬇️ 下级知识</div>
              <div className="sidebar-chips">
                {children.map((k, i) => (
                  <button key={k.id} onClick={() => onNavigate?.(k.id)}
                    className="chip chip-child">
                    {i + 1}. {k.title} →
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 相关知识 */}
          {outgoing.length > 0 && (
            <div className="sidebar-block">
              <div className="sidebar-label">🔗 相关知识</div>
              <div className="sidebar-chips">
                {outgoing.map(k => (
                  <button key={k.id} onClick={() => onNavigate?.(k.id)}
                    className="chip chip-related">
                    {k.title} →
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 被以下知识引用 */}
          {incoming.length > 0 && (
            <div className="sidebar-block">
              <div className="sidebar-label">🔗 被以下知识引用</div>
              <div className="sidebar-chips">
                {incoming.map(k => (
                  <button key={k.id} onClick={() => onNavigate?.(k.id)}
                    className="chip chip-incoming">
                    ← {k.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
        {/* ========== Main Content ========== */}
        <div className="detail-main">
          <div className="detail-grid">

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

          </div>{/* end detail-grid */}
        </div>

      </div>
    </div>
  )

  return content
}
