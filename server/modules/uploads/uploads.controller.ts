import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { AdminTokenGuard } from '../articles/admin-token.guard';
import { UploadsService } from './uploads.service';
import type { UploadImageRequest, UploadImageResponse } from '@shared/api.interface';

/**
 * 管理接口：图片上传到妙搭对象存储（应用默认 bucket）。
 * 与文章 upsert 一样走固定管理 Token 鉴权，供外部上传工具调用。
 */
@UseGuards(AdminTokenGuard)
@Controller('api/admin/upload')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @HttpCode(HttpStatus.OK)
  async uploadImage(@Body() dto: UploadImageRequest): Promise<UploadImageResponse> {
    return this.uploadsService.uploadImage(dto);
  }
}
