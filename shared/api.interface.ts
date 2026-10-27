/* 前后端共享的类型写在这里 */

/** 文章内容类型：html 原样展示，markdown 前端渲染 */
export type ArticleType = 'html' | 'markdown';

/** 文章列表项（不含正文） */
export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  type: ArticleType;
  category: string | null;
  summary: string | null;
  createdAt: string; // ISO 时间串
  updatedAt: string;
}

/** 文章详情（含正文） */
export interface ArticleDetail extends ArticleSummary {
  content: string;
}

/** 文章列表响应 */
export interface ArticleListResponse {
  items: ArticleSummary[];
  total: number;
}

/** 上传/更新文章请求体（管理接口） */
export interface UpsertArticleRequest {
  slug: string;
  title: string;
  type: ArticleType;
  content: string;
  category?: string | null;
  summary?: string;
  published?: boolean;
}

/** 上传/更新文章响应 */
export interface UpsertArticleResponse {
  id: string;
  slug: string;
  created: boolean;
}

/** 上传图片请求体（管理接口，base64 传输避免 multipart） */
export interface UploadImageRequest {
  fileName: string;
  /** 图片 MIME 类型，缺失或为通用二进制时按扩展名识别 */
  contentType?: string;
  contentBase64: string;
}

/** 上传图片响应 */
export interface UploadImageResponse {
  /** 稳定下载地址（可能为相对路径，调用方按需拼接公网域名） */
  url: string;
  /** bucket 内的存储路径 */
  filePath: string;
  bucketId: string;
}
