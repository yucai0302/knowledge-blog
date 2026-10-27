import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

import { ArticlesService } from './articles.service';
import type { ArticleDetail, ArticleListResponse } from '@shared/api.interface';

/** 公开接口：游客无需登录即可读取 */
@Controller('api/posts')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  async list(): Promise<ArticleListResponse> {
    return this.articlesService.listPublished();
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string): Promise<ArticleDetail> {
    const article = await this.articlesService.getPublishedBySlug(slug);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    return article;
  }
}
