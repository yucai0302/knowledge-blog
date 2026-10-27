import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { ArticlesService } from './articles.service';
import { AdminTokenGuard } from './admin-token.guard';
import type { UpsertArticleRequest, UpsertArticleResponse } from '@shared/api.interface';

/**
 * 管理接口：供外部上传工具（AI skill / curl）调用。
 * 刻意不走平台登录态（@NeedLogin），改用固定管理 Token 鉴权，
 * Token 通过环境变量 BLOG_ADMIN_TOKEN 配置。
 */
@UseGuards(AdminTokenGuard)
@Controller('api/admin/posts')
export class ArticlesAdminController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async upsert(@Body() dto: UpsertArticleRequest): Promise<UpsertArticleResponse> {
    return this.articlesService.upsert(dto);
  }
}
