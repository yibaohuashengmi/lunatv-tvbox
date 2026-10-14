#!/usr/bin/env node
/**
 * lunatv2tvbox.js
 * ---------------------------------------------------------------
 * 把 MoonTV / LunaTV 的配置源（api_site 结构）转换成 TVBox 可直接使用的配置。
 *
 * 输入（MoonTV / LunaTV 格式）:
 *   {
 *     "cache_time": 7200,
 *     "api_site": {
 *       "iqiyizyapi.com": { "name": "🎬-爱奇艺-", "api": "https://.../vod", "detail": "https://..." }
 *     }
 *   }
 *
 * 输出（TVBox 格式）:
 *   {
 *     "sites": [ { "key": "csp_xxx", "name": "...", "type": 1, "api": "...", "searchable": 1, ... } ],
 *     "lives": [], "parses": [], "flags": [...], ...
 *   }
 *
 * 用法:
 *   node lunatv2tvbox.js <输入.json> <输出.json> [选项]
 *
 * 选项:
 *   --no-adult        过滤掉名称含 🔞 的源
 *   --all-searchable  不按 _comment 禁用搜索（默认会对"无法搜索/污染搜索结果"等源关闭搜索）
 *   --pretty=false    输出紧凑 JSON
 */

const fs = require('fs');
const path = require('path');

// ---------- 参数解析 ----------
const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith('--'));
const opts = {
  noAdult: argv.includes('--no-adult'),
  allSearchable: argv.includes('--all-searchable'),
  pretty: !argv.includes('--pretty=false'),
};

const [inFile, outFile] = positional;
if (!inFile || !outFile) {
  console.error('用法: node lunatv2tvbox.js <输入.json> <输出.json> [--no-adult] [--all-searchable] [--pretty=false]');
  process.exit(1);
}

// ---------- 工具函数 ----------

/** 把域名转换成合法且唯一的 TVBox key */
function makeKey(domain, used) {
  let base = 'csp_' + String(domain).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  let key = base;
  let i = 2;
  while (used.has(key)) key = `${base}_${i++}`;
  used.add(key);
  return key;
}

/** 名称里是否含成人标记 */
const isAdult = (site) => /🔞/.test(site.name || '');

/** 根据 _comment 判断该源是否应该关闭搜索 */
const SEARCH_BLOCK_WORDS = [
  '无法搜索', '暂不支持搜索', '无搜索结果', '污染搜索结果', '禁止搜索结果', '403',
];
function shouldDisableSearch(site) {
  const c = String(site._comment || '');
  return SEARCH_BLOCK_WORDS.some((w) => c.includes(w));
}

/** 规范化 api 地址：去掉首尾空格；若已有 query 则不动 */
function normalizeApi(api) {
  return String(api || '').trim();
}

// ---------- 转换主体 ----------
function convert(input) {
  const apiSite = input && (input.api_site || input.apiSite);
  if (!apiSite || typeof apiSite !== 'object') {
    throw new Error('输入文件不是 MoonTV/LunaTV 格式：缺少 api_site 字段');
  }

  const used = new Set();
  const sites = [];
  const skipped = [];

  for (const [domain, site] of Object.entries(apiSite)) {
    if (!site || typeof site !== 'object') continue;
    if (opts.noAdult && isAdult(site)) {
      skipped.push(domain);
      continue;
    }
    const api = normalizeApi(site.api);
    if (!api) continue;

    const searchable = opts.allSearchable ? 1 : shouldDisableSearch(site) ? 0 : 1;

    const item = {
      key: makeKey(domain, used),
      name: site.name || domain,
      type: 1, // 1 = 苹果CMS / 通用 JSON-XML 采集接口
      api,
      searchable,
      quickSearch: searchable,
      filterable: 1,
    };
    // detail / _comment 在 TVBox 里没有对应字段，作为附加信息保留（TVBox 会忽略未知字段）
    if (site.detail) item.detail = site.detail;
    if (site._comment) item._comment = site._comment;

    sites.push(item);
  }

  const config = {
    wallpaper: '',
    sites,
    lives: [],
    parses: [],
    flags: [
      'youku', 'qq', 'iqiyi', 'qiyi', 'letv', 'sohu', 'tudou',
      'pptv', 'mgtv', 'wasu', 'bilibili', 'renren', 'xigua',
    ],
    spider: '',
    doh: [
      { name: '阿里DoH', url: 'https://dns.alidns.com/dns-query' },
      { name: '腾讯DoH', url: 'https://doh.pub/dns-query' },
    ],
    rules: [],
    ads: [],
  };

  return { config, skipped, total: sites.length };
}

// ---------- 执行 ----------
try {
  const raw = fs.readFileSync(path.resolve(inFile), 'utf-8');
  const input = JSON.parse(raw);
  const { config, skipped, total } = convert(input);

  const out = opts.pretty ? JSON.stringify(config, null, 2) : JSON.stringify(config);
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(path.resolve(outFile), out, 'utf-8');

  const adult = config.sites.filter((s) => /🔞/.test(s.name)).length;
  const noSearch = config.sites.filter((s) => s.searchable === 0).length;
  console.log(
    `✓ ${inFile} -> ${outFile}\n` +
    `  站点总数: ${total} (普通 ${total - adult} / 成人 ${adult})\n` +
    `  关闭搜索: ${noSearch}${opts.noAdult ? ` | 已过滤成人源: ${skipped.length}` : ''}`
  );
} catch (e) {
  console.error('转换失败:', e.message);
  process.exit(1);
}
