import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { articles } from '@server/database/schema';
import { desc, eq, and, count } from 'drizzle-orm';

import type { ArticleDetail, ArticleListResponse, ArticleSummary, UpsertArticleRequest } from '@shared/api.interface';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /** 已发布文章列表（按创建时间倒序），公开访问 */
  async listPublished(): Promise<ArticleListResponse> {
    const rows = await this.db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        type: articles.type,
        category: articles.category,
        summary: articles.summary,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(eq(articles.published, true))
      .orderBy(desc(articles.createdAt))
      .limit(500);

    return {
      items: rows.map((row) => this.toSummary(row)),
      total: rows.length,
    };
  }

  /** 按 slug 取已发布文章详情，未找到返回 null */
  async getPublishedBySlug(slug: string): Promise<ArticleDetail | null> {
    const rows = await this.db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.published, true)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }
    const row = rows[0];
    return {
      ...this.toSummary(row),
      content: row.content,
    };
  }

  /**
   * 上传/更新文章（按 slug 幂等 upsert）。
   * 仅供携带管理 Token 的外部工具调用，不走平台登录态。
   */
  async upsert(dto: UpsertArticleRequest): Promise<{ id: string; slug: string; created: boolean }> {
    const now = new Date();
    const values = {
      title: dto.title,
      type: dto.type,
      category: dto.category?.trim() ? dto.category.trim() : null,
      summary: dto.summary ?? null,
      content: dto.content,
      published: dto.published ?? true,
    };

    const existing = await this.db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, dto.slug))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(articles)
        .set({ ...values, updatedAt: now })
        .where(eq(articles.slug, dto.slug));
      this.logger.log(`update article slug=${dto.slug} id=${existing[0].id}`);
      return { id: existing[0].id, slug: dto.slug, created: false };
    }

    const inserted = await this.db
      .insert(articles)
      .values({ ...values, slug: dto.slug, createdAt: now, updatedAt: now })
      .returning({ id: articles.id });

    this.logger.log(`create article slug=${dto.slug} id=${inserted[0]?.id}`);
    return { id: inserted[0]?.id ?? '', slug: dto.slug, created: true };
  }

  private toSummary(row: {
    id: string;
    slug: string;
    title: string;
    type: string;
    category: string | null;
    summary: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ArticleSummary {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      type: row.type === 'html' ? 'html' : 'markdown',
      category: row.category,
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
