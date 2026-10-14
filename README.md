# lunatv-tvbox

把 [hafrey1/LunaTV-config](https://github.com/hafrey1/LunaTV-config) 的 **MoonTV / LunaTV 格式**配置源，转换成 **TVBox 可直接订阅**的配置。

## 配置直链

| 文件 | 源数 | 说明 |
|---|---|---|
| `tvbox-jin18.json` | 28 | 精简版 · 禁18 · **推荐** |
| `tvbox-full-no-adult.json` | 39 | 完整版 · 禁18 |
| `tvbox-jingjian.json` | 47 | 精简版 · 含18+ |
| `tvbox-full.json` | 69 | 完整版 · 含18+ |

订阅地址（把文件名换成上表任意一个即可）：

```
https://raw.githubusercontent.com/yibaohuashengmi/lunatv-tvbox/main/tvbox-jin18.json
```

如果 `raw.githubusercontent.com` 打不开，用 jsDelivr 镜像：

```
https://cdn.jsdelivr.net/gh/yibaohuashengmi/lunatv-tvbox@main/tvbox-jin18.json
```

## 怎么用

1. 复制上面的配置地址。
2. 打开 TVBox → 设置 → **配置地址**，粘贴进去。
3. 返回首页下拉刷新 / 重启 App，首页会出现「影视」板块。

> TVBox 拉取时会自动在接口地址后拼接 `?ac=videolist&wd=`，本仓库配置已按此规则适配，直接填地址即可。

## 格式转换说明

原项目用的是 MoonTV / LunaTV 格式：

```json
{
  "cache_time": 7200,
  "api_site": {
    "iqiyizyapi.com": { "name": "🎬-爱奇艺-", "api": "https://…/vod", "detail": "https://…" }
  }
}
```

TVBox 用的是完全不同的结构，转换映射如下：

| LunaTV 字段 | TVBox 字段 | 说明 |
|---|---|---|
| `api_site.<域名>` | `sites[].key` | 域名清洗为 `csp_xxx_yyy`，自动去重 |
| `name` | `name` | 原样保留 |
| `api` | `api` | 原样保留，不改写地址 |
| `detail` | `detail` | TVBox 不使用，作为附加信息保留 |
| `_comment` | 搜索开关 | 见下 |
| — | `type` | 固定 `1`（苹果CMS / 通用 JSON-XML 采集接口） |
| — | `filterable` | 固定 `1` |

**搜索开关**：原项目用 `_comment` 标注了源的质量问题，转换时自动转成 TVBox 的搜索开关。
`_comment` 含 **无法搜索 / 暂不支持搜索 / 无搜索结果 / 污染搜索结果 / 禁止搜索结果 / 403** 的源会被设为
`searchable = 0`、`quickSearch = 0`，避免拖慢聚合搜索或污染搜索结果。

## 重新生成

```bash
# 精简版（28 源，禁 18）
node lunatv2tvbox.js source/jin18.json tvbox-jin18.json --no-adult

# 精简版（47 源，含 18）
node lunatv2tvbox.js source/jingjian.json tvbox-jingjian.json

# 完整版（69 源，含 18）
node lunatv2tvbox.js source/full.json tvbox-full.json

# 完整版禁 18（39 源）
node lunatv2tvbox.js source/full.json tvbox-full-no-adult.json --no-adult
```

参数：`--no-adult` 过滤 🔞 源 ｜ `--all-searchable` 不按 `_comment` 关闭搜索 ｜ `--pretty=false` 输出紧凑 JSON

`source/` 里的 JSON 是从原仓库的 Base58 订阅文件（`jin18.txt` / `jingjian.txt` / `LunaTV-config.txt`）解码还原的。
注：原仓库 README 写的源数量（31/61/88）已过期，实际是 28/47/69。

## 注意

- 源数据整理自互联网公开采集接口，**接口可用性随时会变化**，本仓库只保证格式正确，不保证每个源都能播放。
- 部分源在原项目中通过 CORS 代理访问（`https://pz.v88.qzz.io/?url=…`），转换后原样保留。TVBox 会在末尾追加
  `?ac=videolist&wd=`，该代理会把它当作目标 URL 的一部分处理，可正常工作；若代理失效，把 `api` 改回 `?url=` 后面的真实地址即可。
- 请遵守当地法律法规使用，仅供技术研究与学习交流。
