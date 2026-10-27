import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { siteLikes } from '@server/database/schema';
import { count } from 'drizzle-orm';

import { randomThanks } from './thanks';

@Injectable()
export class LikesService {
  private readonly logger = new Logger(LikesService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /** 全站点赞总数，公开访问 */
  async getTotal(): Promise<number> {
    const rows = await this.db.select({ total: count() }).from(siteLikes);
    return Number(rows[0]?.total ?? 0);
  }

  /** 记录一次点赞并返回最新总数与随机感谢短句 */
  async like(clientId: string): Promise<{ total: number; thanks: string }> {
    await this.db.insert(siteLikes).values({ clientId: clientId.slice(0, 64) });
    const total = await this.getTotal();
    this.logger.log(`like recorded client=${clientId.slice(0, 8)}… total=${total}`);
    return { total, thanks: randomThanks() };
  }
}
