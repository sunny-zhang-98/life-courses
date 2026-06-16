import { useState } from 'react'
import { buildBranchTree } from '../data/index.js'

export default function BranchTree({ branches, activeBranchId, onSelect }) {
  const tree = buildBranchTree(branches)

  return (
    <div className="branch-tree">
      <button
        className={`branch-item ${!activeBranchId ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        <span className="branch-item-icon">📋</span>
        全部知识
      </button>
      {tree.map(branch => (
        <BranchNode
          key={branch.id}
          branch={branch}
          depth={0}
          activeBranchId={activeBranchId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function BranchNode({ branch, depth, activeBranchId, onSelect }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = branch.children && branch.children.length > 0
  const isActive = activeBranchId === branch.id

  return (
    <div>
      <button
        className={`branch-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${20 + depth * 16}px` }}
        onClick={() => onSelect(branch.id)}
      >
        {hasChildren && (
          <span
            className="branch-toggle"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            {expanded ? '▾' : '▸'}
          </span>
        )}
        {!hasChildren && <span className="branch-toggle" />}
        <span className="branch-item-icon">{branch.icon}</span>
        {branch.name}
      </button>
      {hasChildren && expanded && (
        <div className="branch-children">
          {branch.children.map(child => (
            <BranchNode
              key={child.id}
              branch={child}
              depth={depth + 1}
              activeBranchId={activeBranchId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
