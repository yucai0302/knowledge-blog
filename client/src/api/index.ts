import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type { ArticleDetail, ArticleListResponse } from '@shared/api.interface';

// Add more API functions here, use axios instance (`axiosForBackend`) to make requests.

export async function fetchArticles(): Promise<ArticleListResponse> {
  const response = await axiosForBackend({
    url: '/api/posts',
    method: 'GET',
  });
  return response.data;
}

export async function fetchArticleBySlug(slug: string): Promise<ArticleDetail> {
  const response = await axiosForBackend({
    url: `/api/posts/${encodeURIComponent(slug)}`,
    method: 'GET',
  });
  return response.data;
}

/** 全站点赞总数（无需登录） */
export async function fetchLikeTotal(): Promise<number> {
  const response = await axiosForBackend({
    url: '/api/likes',
    method: 'GET',
  });
  return response.data.total;
}

/** 记录一次点赞，返回最新总数与随机感谢短句 */
export async function postLike(clientId: string): Promise<{ total: number; thanks: string }> {
  const response = await axiosForBackend({
    url: '/api/likes',
    method: 'POST',
    data: { clientId },
  });
  return response.data;
}
