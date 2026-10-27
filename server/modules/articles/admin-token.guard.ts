import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

/** 简单固定 Token 鉴权：请求头 X-Blog-Token 必须与环境变量 BLOG_ADMIN_TOKEN 一致 */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = (request.headers['x-blog-token'] ?? '') as string;
    const expected = process.env.BLOG_ADMIN_TOKEN ?? '';
    if (expected.length === 0) {
      // 未配置 Token 时直接拒绝，避免接口裸奔
      throw new UnauthorizedException('服务端未配置 BLOG_ADMIN_TOKEN');
    }
    if (token !== expected) {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }
}
