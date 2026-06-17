#!/usr/bin/env node
/**
 * rename-knowledge.js
 *
 * 可复用的知识条目重命名工具。
 * 重命名一个知识条目时，自动更新所有引用该条目的地方。
 *
 * 功能：
 * 1. 重命名文件 <旧ID>.json → <新ID>.json
 * 2. 更新 JSON 内的 id 字段
 * 3. 迁移旧字段结构（costOfIgnorance+commonMistakes → lesson, details → detail）
 * 4. 更新所有知识文件中 related/children 数组的引用
 * 5. 更新 relations/*.json 中 from/to 的引用
 *
 * 用法：
 *   node scripts/rename-knowledge.js <旧ID> <新ID>
 *   node scripts/rename-knowledge.js running 跑步
 *
 * 模块用法：
 *   const { renameKnowledge } = require('./rename-knowledge.js');
 *   renameKnowledge('running', '跑步');
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.resolve(__dirname, '../src/data/knowledge');
const RELATIONS_DIR = path.resolve(__dirname, '../src/data/relations');

// ─── 字段迁移：将旧结构转换为新结构 ───

/**
 * 将旧字段结构迁移到新结构
 * - costOfIgnorance + commonMistakes → lesson
 * - knowledge.details → knowledge.detail
 *
 * @param {object} data - 知识条目 JSON 数据（会被直接修改）
 * @returns {boolean} 是否发生了变更
 */
function migrateStructure(data) {
  let changed = false;

  // costOfIgnorance + commonMistakes → lesson (字符串)
  if (data.costOfIgnorance !== undefined || data.commonMistakes !== undefined) {
    data.lesson = data.costOfIgnorance || '';
    delete data.costOfIgnorance;
    delete data.commonMistakes;
    changed = true;
  }

  // knowledge.details → knowledge.detail
  if (
    data.knowledge &&
    data.knowledge.details !== undefined &&
    data.knowledge.detail === undefined
  ) {
    data.knowledge.detail = data.knowledge.details;
    delete data.knowledge.details;
    changed = true;
  }

  return changed;
}

// ─── 核心重命名逻辑 ───

/**
 * 重命名一个知识条目（包含所有交叉引用的更新）
 *
 * @param {string} oldId - 旧 ID/文件名
 * @param {string} newId - 新 ID/文件名
 * @returns {boolean} 是否成功
 */
function renameKnowledge(oldId, newId) {
  if (!oldId || !newId) {
    console.error('❌ 必须提供旧ID和新ID');
    return false;
  }
  if (oldId === newId) {
    console.warn(`⚠️ 新旧ID相同，跳过: ${oldId}`);
    return true;
  }

  const oldFile = `${oldId}.json`;
  const newFile = `${newId}.json`;
  const oldPath = path.join(KNOWLEDGE_DIR, oldFile);
  const newPath = path.join(KNOWLEDGE_DIR, newFile);

  // 验证文件存在
  if (!fs.existsSync(oldPath)) {
    console.error(`❌ 文件不存在: ${oldFile}`);
    return false;
  }

  // 验证目标不冲突
  if (fs.existsSync(newPath)) {
    console.error(`❌ 目标文件已存在: ${newFile}`);
    return false;
  }

  // ─── 第1步：读取并转换当前文件 ───
  const data = JSON.parse(fs.readFileSync(oldPath, 'utf-8'));

  const structureChanged = migrateStructure(data);
  const idChanged = data.id !== newId;
  data.id = newId;

  fs.writeFileSync(newPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.unlinkSync(oldPath);

  // ─── 第2步：更新其他知识文件中的引用 ───
  const otherFiles = fs.readdirSync(KNOWLEDGE_DIR)
    .filter(f => f.endsWith('.json') && f !== newFile);

  for (const file of otherFiles) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const entry = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let changed = false;

    // related 数组
    if (Array.isArray(entry.related)) {
      const idx = entry.related.indexOf(oldId);
      if (idx !== -1) {
        entry.related[idx] = newId;
        changed = true;
      }
    }

    // children 数组
    if (Array.isArray(entry.children)) {
      const idx = entry.children.indexOf(oldId);
      if (idx !== -1) {
        entry.children[idx] = newId;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
    }
  }

  // ─── 第3步：更新关系文件中的引用 ───
  const relationFiles = fs.readdirSync(RELATIONS_DIR)
    .filter(f => f.endsWith('.json'));

  for (const file of relationFiles) {
    const filePath = path.join(RELATIONS_DIR, file);
    const rel = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let changed = false;

    if (Array.isArray(rel.links)) {
      for (const link of rel.links) {
        if (link.from === oldId) {
          link.from = newId;
          changed = true;
        }
        if (link.to === oldId) {
          link.to = newId;
          changed = true;
        }
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(rel, null, 2) + '\n', 'utf-8');
    }
  }

  // ─── 报告 ───
  const changes = [];
  if (idChanged) changes.push('ID/文件名');
  if (structureChanged) changes.push('结构迁移');
  const refCount = otherFiles.filter(f => {
    const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, f), 'utf-8');
    return content.includes(`"${newId}"`);
  }).length;
  if (refCount > 0) changes.push(`更新${refCount}处交叉引用`);

  console.log(`✅ [${oldId} → ${newId}] ${changes.join(' + ') || '无变更'}`);
  return true;
}

// ─── CLI 入口 ───
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help')) {
    console.log(`
用法:
  node scripts/rename-knowledge.js <旧ID> <新ID>

示例:
  node scripts/rename-knowledge.js running 跑步
  node scripts/rename-knowledge.js atomic-habits 掌控习惯

说明:
  自动处理以下变更:
  - 重命名文件
  - 更新 id 字段
  - 迁移旧字段结构 (costOfIgnorance→lesson, details→detail)
  - 更新所有知识文件中的 related/children 引用
  - 更新 relations/*.json 中的 from/to 引用
`);
    process.exit(args.includes('--help') ? 0 : 1);
  }

  const [oldId, newId] = args;
  const success = renameKnowledge(oldId, newId);
  process.exit(success ? 0 : 1);
}

module.exports = { renameKnowledge };
