import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { LikesService } from './likes.service';

/** 全站点赞：公开接口，无需登录，任何人点击都计入统计 */
@Controller('api/likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Get()
  async total(): Promise<{ total: number }> {
    return { total: await this.likesService.getTotal() };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async like(@Body() body: { clientId?: string }): Promise<{ total: number; thanks: string }> {
    const clientId = (body?.clientId ?? '').trim() || 'anonymous';
    return this.likesService.like(clientId);
  }
}
