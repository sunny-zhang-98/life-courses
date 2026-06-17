import branches from './branches.json'

// Dynamically import all knowledge files
const knowledgeContext = import.meta.glob('./knowledge/*.json', { eager: true, import: 'default' })
const knowledgeList = Object.values(knowledgeContext)

// Build a map for quick lookup
const knowledgeMap = {}
knowledgeList.forEach(k => { knowledgeMap[k.id] = k })

// ─── Relations (directional links extracted from knowledge items) ───

const relationContext = import.meta.glob('./relations/*.json', { eager: true, import: 'default' })
const relationList = Object.values(relationContext)

// Build lookup maps for each relation: fromMap (from → [to]) and toMap (to → [from])
function buildRelationMaps(rel) {
  const fromMap = {}
  const toMap = {}
  for (const link of (rel.links || [])) {
    if (!fromMap[link.from]) fromMap[link.from] = []
    fromMap[link.from].push(link.to)
    if (!toMap[link.to]) toMap[link.to] = []
    toMap[link.to].push(link.from)
  }
  return { fromMap, toMap }
}

const relationIndex = {}
const relationFromMap = {}  // relationId → { fromId: [toId, ...] }
const relationToMap = {}    // relationId → { toId: [fromId, ...] }

for (const rel of relationList) {
  const { fromMap, toMap } = buildRelationMaps(rel)
  relationIndex[rel.id] = rel
  relationFromMap[rel.id] = fromMap
  relationToMap[rel.id] = toMap
}

// Active relation state (module-level, can be overridden by UI)
let activeRelationId = relationList.find(r => r.default)?.id || (relationList[0]?.id || null)

export function getActiveRelationId() {
  return activeRelationId
}

export function setActiveRelationId(id) {
  if (relationIndex[id]) {
    activeRelationId = id
  }
}

export function getActiveRelation() {
  return relationIndex[activeRelationId] || null
}

export { relationList }

export function getRelationById(id) {
  return relationIndex[id] || null
}

/**
 * Get the from→to link map for a given relation (or active).
 * Returns { [fromId]: [toId, ...] }
 */
export function getRelationLinks(relationId = null) {
  const id = relationId || activeRelationId
  return relationFromMap[id] || {}
}

/**
 * Get the to→from reverse link map for a given relation (or active).
 * Returns { [toId]: [fromId, ...] }
 */
export function getRelationReverseLinks(relationId = null) {
  const id = relationId || activeRelationId
  return relationToMap[id] || {}
}

// ─── Build a tree from flat branch list (for sidebar navigation) ───

function buildBranchTree(branchList, parentId = null) {
  return branchList
    .filter(b => b.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .map(b => ({
      ...b,
      children: buildBranchTree(branchList, b.id)
    }))
}

// ─── Get knowledge entries filtered by branch ───

function getFilteredKnowledge(branchId = null) {
  let filtered = knowledgeList
  if (branchId) {
    filtered = filtered.filter(k => k.branchIds.includes(branchId))
  }
  return filtered
}

// ─── Children / Parent (hierarchical, from knowledge entries) ───

function getChildren(knowledgeId) {
  const entry = knowledgeMap[knowledgeId]
  if (!entry) return []
  return (entry.children || [])
    .map(id => knowledgeMap[id])
    .filter(Boolean)
}

function getParent(knowledgeId) {
  return knowledgeList.find(k => (k.children || []).includes(knowledgeId)) || null
}

// ─── Next / Prev (sequential relations, from relation files) ───

function getNext(knowledgeId, relationId = null) {
  const id = relationId || activeRelationId
  const fromMap = relationFromMap[id]
  if (!fromMap) return []
  return (fromMap[knowledgeId] || [])
    .map(tid => knowledgeMap[tid])
    .filter(Boolean)
}

function getPrev(knowledgeId, relationId = null) {
  const id = relationId || activeRelationId
  const toMap = relationToMap[id]
  if (!toMap) return []
  return (toMap[knowledgeId] || [])
    .map(fid => knowledgeMap[fid])
    .filter(Boolean)
}

// ─── Weak related connections ───

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
