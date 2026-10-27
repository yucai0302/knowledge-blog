import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FileService } from '@lark-apaas/fullstack-nestjs-core';
import { RequestContextService } from '@lark-apaas/nestjs-common';

import type { UploadImageRequest, UploadImageResponse } from '@shared/api.interface';

/** 允许的图片 MIME 类型白名单 */
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/bmp',
]);

/** 解码后最大 12MB（base64 传输膨胀约 33%，请求体限制 20mb） */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/** 扩展名兜底映射（contentType 缺失或为 application/octet-stream 时按扩展名识别） */
const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
};

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly fileService: FileService,
    private readonly requestContextService: RequestContextService,
  ) {}

  /**
   * 上传图片到应用默认 bucket（妙搭对象存储），返回稳定的下载地址。
   * 供携带管理 Token 的外部工具（blog-upload skill）调用。
   */
  async uploadImage(dto: UploadImageRequest): Promise<UploadImageResponse> {
    const fileName = dto.fileName?.trim() ?? '';
    if (!fileName) {
      throw new BadRequestException('fileName 不能为空');
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(dto.contentBase64, 'base64');
    } catch {
      throw new BadRequestException('contentBase64 不是合法的 base64');
    }
    if (buffer.length === 0) {
      throw new BadRequestException('图片内容为空');
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(`图片超过大小限制（${MAX_IMAGE_BYTES / 1024 / 1024}MB）`);
    }

    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
    const contentType = this.resolveContentType(dto.contentType, ext);
    if (!contentType) {
      throw new BadRequestException(`不支持的图片类型: ${dto.contentType || ext || '(未知)'}`);
    }

    // 外部匿名调用时网关不会注入 userContext，appId 为空会导致存储内部接口
    // 拼出 /app//... 的错误路径 —— 用平台环境变量兜底补齐
    const appId = this.requestContextService.getContext()?.appId;
    if (!appId) {
      const fallback = process.env.MIAODA_APP_ID ?? process.env.app_id ?? '';
      if (!fallback) {
        throw new BadRequestException('服务端无法解析 appId（缺少 MIAODA_APP_ID 环境变量）');
      }
      this.requestContextService.setContext({ appId: fallback });
    }

    // 按月分目录 + 随机串防覆盖，文件名仅保留安全字符
    const safeName = fileName.replace(/[^\p{L}\p{N}._-]+/gu, '_');
    const month = new Date().toISOString().slice(0, 7).replace('-', '');
    const rand = Math.random().toString(36).slice(2, 8);
    const filePath = `blog/${month}/${Date.now()}-${rand}-${safeName}`;

    const meta = await this.fileService.upload(buffer, {
      fileName: safeName,
      contentType,
      filePath,
    });

    this.logger.log(`upload image filePath=${meta.filePath} bytes=${buffer.length}`);
    return {
      url: meta.downloadURL,
      filePath: meta.filePath,
      bucketId: meta.bucketID,
    };
  }

  private resolveContentType(raw: string | undefined, ext: string): string | null {
    const mime = raw?.trim().toLowerCase() ?? '';
    if (mime && ALLOWED_MIME_TYPES.has(mime)) return mime;
    // 常见的通用二进制类型按扩展名重新识别
    if (!mime || mime === 'application/octet-stream' || mime === 'image') {
      const byExt = EXT_MIME[ext];
      if (byExt) return byExt;
    }
    return null;
  }
}
