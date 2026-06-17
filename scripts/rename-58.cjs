#!/usr/bin/env node
/**
 * rename-58.js
 *
 * 批量重命名所有 58 个知识条目，将英文 ID 改为中文 ID。
 * 依赖 rename-knowledge.js 的处理能力。
 *
 * 用法:
 *   node scripts/rename-58.js
 *
 * 流程:
 *   对每个条目：结构迁移 + 重命名文件 + 更新所有交叉引用
 */

const { renameKnowledge } = require('./rename-knowledge.cjs');

// ─── ID 映射表：英文 → 中文 ───
// 以知识条目标题为准，去掉 emoji，使用简洁可读的中文名
const MAPPING = {
  "atomic-habits": "掌控习惯",
  "baduanjin": "八段锦",
  "brain": "大脑",
  "buddhism-taoism-confucianism": "佛道儒思想",
  "cardiovascular-system": "心血管系统",
  "career-planning": "职业规划",
  "communication": "沟通与表达",
  "critical-thinking": "批判性思维",
  "death-education": "死亡教育",
  "deliberate-practice": "刻意练习",
  "digestive-system": "消化系统",
  "economy-thinking": "经济学思维",
  "emotion-management": "情绪管理",
  "entrepreneurship": "创业",
  "exercise-basics": "科学健身",
  "family-relationships": "家庭关系",
  "feynman-method": "费曼学习法",
  "finance-basics": "理财入门",
  "finance-wealth": "财务理财",
  "first-job": "第一份工作",
  "first-principles": "第一性原理",
  "foundation-skills": "基础能力",
  "health-wellness": "身心健康",
  "heart": "心脏",
  "human-body": "人体知识",
  "immune-system": "免疫系统",
  "intimate-relationships": "亲密关系",
  "investing-basics": "投资基础",
  "kidneys": "肾脏",
  "lean-startup": "精益创业",
  "learn-to-code": "编程入门",
  "life-purpose": "人生意义",
  "liver": "肝脏",
  "lungs": "肺",
  "meditation": "冥想正念",
  "muscular-system": "肌肉系统",
  "nervous-system": "神经系统",
  "never-split-the-difference": "掌控谈话",
  "note-taking": "笔记方法",
  "nutrition-basics": "营养基础",
  "reading": "有效阅读",
  "respiratory-system": "呼吸系统",
  "running": "跑步",
  "skeletal-system": "骨骼系统",
  "skin": "皮肤",
  "sleep-health": "睡眠健康",
  "society-citizenship": "社会公民",
  "stomach": "胃",
  "stress-management": "压力管理",
  "taiji": "太极",
  "thinking-learning": "思维学习",
  "tiaocao": "跳操",
  "time-management": "时间管理",
  "wang-yangming": "王阳明心学",
  "work-career": "工作事业",
  "writing-basics": "写作基础",
  "xunxujianjin": "循序渐进",
  "zhanzhuang": "站桩"
};

const entries = Object.entries(MAPPING);
const total = entries.length;

console.log(`\n🔁 开始批量重命名 ${total} 个知识条目...\n`);

let success = 0;
let fail = 0;

for (const [oldId, newId] of entries) {
  if (renameKnowledge(oldId, newId)) {
    success++;
  } else {
    fail++;
  }
}

console.log(`\n${'─'.repeat(40)}`);
console.log(`📊 结果: ${success} 成功, ${fail} 失败 / 共 ${total} 项`);

if (fail > 0) {
  process.exit(1);
}
