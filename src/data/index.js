import branches from './branches.json'

// Dynamically import all knowledge files
const knowledgeContext = import.meta.glob('./knowledge/*.json', { eager: true, import: 'default' })
const knowledgeList = Object.values(knowledgeContext)

// Build a map for quick lookup
const knowledgeMap = {}
knowledgeList.forEach(k => { knowledgeMap[k.id] = k })

// Build a tree from flat branch list (for sidebar navigation)
function buildBranchTree(branchList, parentId = null) {
  return branchList
    .filter(b => b.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .map(b => ({
      ...b,
      children: buildBranchTree(branchList, b.id)
    }))
}

// Get knowledge entries filtered by branch
function getFilteredKnowledge(branchId = null) {
  let filtered = knowledgeList
  if (branchId) {
    filtered = filtered.filter(k => k.branchIds.includes(branchId))
  }
  return filtered
}

// Get children (direct sub-topics)
function getChildren(knowledgeId) {
  const entry = knowledgeMap[knowledgeId]
  if (!entry) return []
  return (entry.children || [])
    .map(id => knowledgeMap[id])
    .filter(Boolean)
}

// Get parent (the topic this is a child of)
function getParent(knowledgeId) {
  return knowledgeList.find(k => (k.children || []).includes(knowledgeId)) || null
}

// Get next steps (顺序关系: what to learn after this)
function getNext(knowledgeId) {
  const entry = knowledgeMap[knowledgeId]
  if (!entry) return []
  return (entry.next || [])
    .map(id => knowledgeMap[id])
    .filter(Boolean)
}

// Get prev steps (顺序关系: what should be learned before this)
function getPrev(knowledgeId) {
  return knowledgeList
    .filter(k => (k.next || []).includes(knowledgeId))
    .map(k => knowledgeMap[k.id])
    .filter(Boolean)
}

// Get connected knowledge (weak related connections)
function getConnectedKnowledge(knowledgeId) {
  const entry = knowledgeMap[knowledgeId]
  if (!entry) return { outgoing: [], incoming: [] }

  const outgoing = (entry.related || [])
    .map(id => knowledgeMap[id])
    .filter(Boolean)

  const incoming = knowledgeList
    .filter(k => k.id !== knowledgeId && (k.related || []).includes(knowledgeId))
    .map(k => knowledgeMap[k.id])
    .filter(Boolean)

  return { outgoing, incoming }
}

export {
  branches,
  knowledgeList,
  knowledgeMap,
  buildBranchTree,
  getFilteredKnowledge,
  getChildren,
  getParent,
  getNext,
  getPrev,
  getConnectedKnowledge
}
