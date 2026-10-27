/** 博客分类定义与文章归类：优先读文章自带的 category 字段（上传时指定），slug 映射为存量文章兜底 */

export interface Category {
  key: string;
  label: string;
}

export const CATEGORIES: Category[] = [
  { key: 'harness', label: 'Harness 工程' },
  { key: 'agent', label: 'Agent 工程' },
  { key: 'skill', label: 'Skill' },
  { key: 'practice', label: '工程实践' },
  { key: 'papers', label: '论文阅读' },
  { key: 'knowledge', label: '知识库' },
  { key: 'notes', label: '随笔杂谈' },
  { key: 'pm', label: 'PM' },
];

const SLUG_CATEGORY: Record<string, string> = {
  // 可选：按 slug 兜底归类（例如 'my-first-post': 'notes'）
};

export const OTHER_CATEGORY = 'other';

/** 单篇文章的归类：服务端 category 优先，其次 slug 兜底映射 */
export function articleCategory(article: {
  slug: string;
  category?: string | null;
}): string {
  if (article.category && CATEGORIES.some((c) => c.key === article.category)) {
    return article.category;
  }
  return SLUG_CATEGORY[article.slug] ?? OTHER_CATEGORY;
}

export function categoryLabel(key: string): string {
  if (key === OTHER_CATEGORY) return '其他';
  return CATEGORIES.find((c) => c.key === key)?.label ?? '其他';
}
