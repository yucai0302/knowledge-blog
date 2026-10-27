#!/usr/bin/env node
/**
 * blog-upload 上传脚本
 * 用法: node upload.mjs <file> [--slug xxx] [--title xxx] [--summary xxx] [--type html|markdown] [--category xxx] [--unpublished]
 *
 * 行为:
 *  1. GET 首页拿 suda-csrf-token cookie（平台 CSRF double-submit 机制要求）
 *  2. 扫描正文中的本地图片引用（markdown ![](...) 与 html <img src>），
 *     逐个 POST {baseUrl}/api/admin/upload/image 上传到妙搭对象存储并替换为 URL
 *  3. POST {baseUrl}/api/admin/posts 上传/更新文章（幂等 upsert）
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve, basename, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(SCRIPT_DIR, '..', 'config.json');

function parseArgs(argv) {
  const args = { _: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--slug') args.slug = argv[++i];
    else if (a === '--title') args.title = argv[++i];
    else if (a === '--summary') args.summary = argv[++i];
    else if (a === '--type') args.type = argv[++i];
    else if (a === '--category') args.category = argv[++i];
    else if (a === '--unpublished') args.unpublished = true;
    else if (!a.startsWith('--')) args._ = a;
  }
  return args;
}

function detectType(file) {
  const ext = extname(file).toLowerCase();
  if (['.md', '.markdown'].includes(ext)) return 'markdown';
  if (['.html', '.htm'].includes(ext)) return 'html';
  fail(`无法从扩展名识别类型: ${file}，请用 --type 指定`);
}

function deriveSlug(file) {
  return basename(file)
    .replace(/\.(html?|markdown|md)$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

function extractHtmlTitle(html, fallback) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : fallback;
}

function extractMdTitle(md, fallback) {
  for (const line of md.split('\n')) {
    const m = line.trim().match(/^#\s+(.+)$/);
    if (m) return m[1].trim();
  }
  return fallback;
}

/** 剥离 md 正文首个一级标题：页面已用 title 字段渲染大标题，正文再带 H1 会重复显示 */
function stripLeadingMdH1(md) {
  const lines = md.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  if (i < lines.length && /^#\s+\S/.test(lines[i].trim())) {
    return lines.slice(0, i).concat(lines.slice(i + 1)).join('\n').replace(/^\s+/, '');
  }
  return md;
}
function extractSummary(content, type) {
  if (type === 'markdown') {
    // 跳过标题与空行后的第一段非标记文本
    for (const raw of content.split('\n')) {
      const text = raw.trim().replace(/^[-*>\s]+/, '').replace(/[#*`[\]]/g, '');
      if (text.length >= 15 && !text.startsWith('#')) {
        return text.slice(0, 80);
      }
    }
    return undefined;
  }
  const meta = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (meta) return meta[1].slice(0, 80);
  // 第一段有实际内容的 <p> 文本
  const body = content.slice(content.search(/<body/i));
  for (const m of body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text.length >= 20) return text.slice(0, 80);
  }
  return undefined;
}

function fail(msg) {
  console.error(`[blog-upload] ERROR: ${msg}`);
  process.exit(1);
}

async function getCsrf(baseUrl) {
  const res = await fetch(baseUrl, { redirect: 'manual' });
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const c of cookies) {
    const m = c.match(/suda-csrf-token=([^;]+)/);
    if (m) return m[1];
  }
  fail('首页响应中没有 suda-csrf-token cookie');
}

/** 图片扩展名白名单（与服务端一致） */
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp']);

/** 判断引用路径是否为需要上传的本地图片（排除 http(s)/data/锚点/纯远程形态） */
function isLocalImagePath(ref) {
  if (!ref) return false;
  if (/^(https?:|data:|blob:|mailto:|tel:|#|\/\/)/i.test(ref)) return false;
  const clean = ref.split('#')[0].split('?')[0];
  const ext = extname(clean).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) return false;
  // markdown 引用式语法 ![alt][ref] 的 ref 不是路径
  return !/^\s*$/.test(clean);
}

/**
 * 提取正文中所有本地图片引用（保持出现顺序，去重）。
 * markdown: ![alt](path) 与 html: <img src="path"> / <img src='path'>
 */
function extractLocalImageRefs(content) {
  const refs = [];
  const seen = new Set();
  const push = (ref) => {
    if (isLocalImagePath(ref) && !seen.has(ref)) {
      seen.add(ref);
      refs.push(ref);
    }
  };
  // markdown 图片（含标题语法 ![alt](path "title")）
  for (const m of content.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)(?:\s+[^)]*)?\)/g)) {
    push(decodeURIComponent(m[1]));
  }
  // html img src
  for (const m of content.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    push(decodeURIComponent(m[1]));
  }
  return refs;
}

/** 上传单张本地图片，返回可直接嵌入正文的公网 URL */
async function uploadImage(baseUrl, csrf, token, imagePath) {
  let buf;
  try {
    buf = readFileSync(imagePath);
  } catch (e) {
    fail(`读取图片失败 ${imagePath}: ${e.message}`);
  }
  const fileName = basename(imagePath);
  const res = await fetch(`${baseUrl}/api/admin/upload/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Cookie: `suda-csrf-token=${csrf}`,
      'X-Suda-Csrf-Token': csrf,
      'X-Blog-Token': token,
    },
    body: JSON.stringify({
      fileName,
      contentType: mimeFromExt(extname(fileName).toLowerCase()),
      contentBase64: buf.toString('base64'),
    }),
  });
  const text = await res.text();
  if (res.status !== 200) {
    fail(`图片上传失败 ${fileName} HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    fail(`图片上传响应解析失败 ${fileName}: ${text.slice(0, 200)}`);
  }
  // 相对路径（如 /spark/app/app_xxx/runtime/...）只拼公网域名（origin）：
  // baseUrl 自带 /app/<appId> 前缀，整段拼接会产生 /app/../spark/../... 的重叠路径
  const origin = new URL(baseUrl).origin;
  const url = /^https?:\/\//i.test(data.url) ? data.url : `${origin}${data.url}`;
  return { fileName, url };
}

function mimeFromExt(ext) {
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
  };
  return map[ext];
}

/** 把正文中的本地图片引用替换为上传后的 URL（对引用原文做字面替换，含 URL 编码形态） */
function replaceImageRefs(content, refToUrl) {
  let out = content;
  for (const [ref, url] of Object.entries(refToUrl)) {
    const variants = new Set([ref]);
    let encoded;
    try {
      encoded = encodeURI(ref);
    } catch {
      encoded = null;
    }
    if (encoded && encoded !== ref) variants.add(encoded);
    for (const v of variants) {
      // 转义正则特殊字符后字面替换
      const re = new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      out = out.replace(re, url);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args._) {
    console.error('用法: node upload.mjs <file> [--slug xxx] [--title xxx] [--summary xxx] [--type html|markdown] [--category xxx] [--unpublished]');
    process.exit(1);
  }

  let config = {};
  try {
    config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    // 没有 config.json 时回退到环境变量
  }
  const baseUrl = (process.env.BLOG_BASE_URL || config.baseUrl || '').replace(/\/+$/, '');
  const token = process.env.BLOG_ADMIN_TOKEN || config.token || '';
  if (!baseUrl || !token) {
    fail('缺少 baseUrl 或 token：请设置环境变量 BLOG_BASE_URL / BLOG_ADMIN_TOKEN，或按 config.example.json 创建 config.json');
  }

  const file = args._;
  const type = args.type || detectType(file);
  const content = (() => {
    try {
      return readFileSync(file, 'utf8');
    } catch (e) {
      fail(`读取文件失败 ${file}: ${e.message}`);
    }
  })();

  const fallbackTitle = basename(file).replace(/\.[^.]+$/, '');
  const payload = {
    slug: args.slug || deriveSlug(file),
    title: args.title || (type === 'html' ? extractHtmlTitle(content, fallbackTitle) : extractMdTitle(content, fallbackTitle)),
    type,
    content,
    category: args.category ?? null,
    summary: args.summary ?? extractSummary(content, type),
    published: !args.unpublished,
  };

  const csrf = await getCsrf(baseUrl);

  // 本地图片 → 上传对象存储并替换为 URL（路径相对文章文件所在目录解析）
  const refs = extractLocalImageRefs(content);
  const refToUrl = {};
  for (const ref of refs) {
    const imagePath = resolve(dirname(file), ref);
    const { fileName, url } = await uploadImage(baseUrl, csrf, token, imagePath);
    refToUrl[ref] = url;
    console.error(`[blog-upload] image ok: ${fileName} -> ${url}`);
  }
  let finalContent = refs.length > 0 ? replaceImageRefs(content, refToUrl) : content;
  if (type !== 'html') finalContent = stripLeadingMdH1(finalContent); // 兼容 --type md / markdown 两种取值

  const res = await fetch(`${baseUrl}/api/admin/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Cookie: `suda-csrf-token=${csrf}`,
      'X-Suda-Csrf-Token': csrf,
      'X-Blog-Token': token,
    },
    body: JSON.stringify({ ...payload, content: finalContent }),
  });
  const text = await res.text();
  if (res.status !== 200) {
    fail(`上传失败 HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    fail(`响应解析失败: ${text.slice(0, 300)}`);
  }
  console.log(JSON.stringify({
    ok: true,
    action: data.created ? 'created' : 'updated',
    slug: data.slug,
    title: payload.title,
    type: payload.type,
    category: payload.category,
    published: payload.published,
    imagesUploaded: refs.length,
    bytes: Buffer.byteLength(finalContent, 'utf8'),
    listUrl: `${baseUrl}/`,
    postUrl: `${baseUrl}/post/${encodeURIComponent(data.slug)}`,
  }, null, 2));
}

main().catch((e) => fail(e.stack || e.message));
