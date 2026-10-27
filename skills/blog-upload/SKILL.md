---
name: blog-upload
description: 把本地文章（HTML 或 Markdown 文件）上传到本项目的个人知识博客。当用户说"上传到博客""发布这篇文章""把这篇文章发到我的博客"时触发。支持 .html 直出与 .md 渲染，自动提取标题/摘要/slug，本地图片自动上传到对象存储，幂等 upsert。
---

# 个人知识博客上传

把本地的 HTML / Markdown 文件发布到用本项目搭起来的博客。

## 配置

脚本按以下顺序读取配置，先命中先用：

1. 环境变量 `BLOG_BASE_URL`（含 `/app/<app-id>` 前缀）与 `BLOG_ADMIN_TOKEN`
2. 同目录上一级的 `config.json`（参考 `config.example.json` 自行创建，不要提交进 git）

- `baseUrl` 示例：`https://<your-app-domain>/app/<your-app-id>`
- `token` 就是服务端 `.env` 里的 `BLOG_ADMIN_TOKEN`
- 公开访问：任何人无需登录即可阅读；列表页 `/`，文章页 `/post/<slug>`

## 使用方法

**必须**用以下命令上传（不要手写 curl）：

```bash
node "<skill目录>/scripts/upload.mjs" "<文件路径>" [--slug xxx] [--title xxx] [--summary xxx] [--type html|markdown] [--category <key>] [--unpublished]
```

- `文件路径`：要发布的 `.html` 或 `.md` 文件
- `--slug`：URL 标识（可选项，缺省从文件名生成；建议对中文文件名显式指定英文 slug）
- `--title`：标题（缺省从 HTML `<title>` 或 MD 首个一级标题提取；MD 的首个一级标题会自动从正文中剥离，避免与页面标题重复）
- `--summary`：摘要（缺省自动提取，可为空）
- `--type`：内容类型（缺省按扩展名判断；html 原样直出，markdown 前端渲染）
- `--category`：分类 key（可选）。合法值见 `client/src/lib/categories.ts` 的 `CATEGORIES`
- `--unpublished`：仅保存不公开（下架/草稿用）

同一 slug 重复上传为**覆盖更新**（幂等），修改后重新上传即可。

## 本地图片自动上传

正文中引用的本地图片会**自动上传**到对象存储（应用默认 bucket），并把引用替换为公网 URL：

- 识别范围：Markdown `![alt](path)` 与 HTML `<img src="path">`
- 判定规则：路径非 `http(s)://`、`data:` 开头，且扩展名为 png/jpg/jpeg/gif/webp/svg/avif/bmp
- 路径解析：相对文章文件所在目录（支持 `./img/a.png`、`img/a.png`、`../assets/a.png`）
- 上传后存储路径形如 `blog/<yyyyMM>/<timestamp>-<rand>-<name>`，按月归档不覆盖
- 同一张图片多次引用只上传一次；已有外链图片原样保留
- 限制：单张 ≤ 12MB

上传结果在返回 JSON 的 `imagesUploaded` 字段，stderr 里有每张图的 `文件名 -> URL` 明细。

## 注意事项

1. 上传成功标志：返回 `"ok": true` 且无 error 字段；脚本退出码 0
2. 上传后向用户复述：文章标题与访问链接（返回 JSON 里的 `postUrl`）
3. 如需删除文章：用 `--unpublished` 下架（保留数据）；物理删除需走数据库 SQL
4. Token 泄露风险：不要把 `config.json` 或 Token 复制给他人、也不要提交进 git
