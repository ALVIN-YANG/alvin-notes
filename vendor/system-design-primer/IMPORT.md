# System Design Primer 中文文档

`README-zh-Hans.md` 和 `LICENSE.txt` 是 manifest.json 指定 commit 的原始文件。正文版权属于原作者，译者署名保留在中文文件与站点首章。

## 维护

- `npm run system-design:sync`：从本地固定快照生成章节，不追踪 master。
- `npm run system-design:check`：离线检查原文 hash、章节内容、图片 hash、目录与锚点映射。
- `node scripts/sync-system-design.mjs --update=<完整 commit SHA>`：明确更新上游快照与图片，随后审查 diff。
- `npm run build`：先校验源文件，再构建，并核对全部章节的渲染文字、表格、代码块、图片、内部链接与翻页。

章节文件与 public/system-design-search.json 由脚本生成，不要直接修改。文档搜索按原文短语匹配，直接定位小节；索引只在首次搜索时加载，无后端服务。章节标题、顺序和正文源于中文 README。首章合并原文开头与“目的”；多语言切换行仅从展示移除，原始文件完整保留。下一级章节保留原文标题级别与锚点。

remark-system-design.mjs 在构建时处理链接、图片和两处旧格式兼容，不修改保存的正文：

- 三处原文失效锚点按 manifest.aliases 映射到对应小节；其中 memcached 指向介绍 Memcached 的“应用缓存”。
- Markdown 里的相对仓库链接指向固定 commit，站内章节引用改成本地 URL。
- 原图本地保存，带原始尺寸与 hash。旧 camo 图片代理已失效，从代理 URL 中编码的原始 Imgur 地址获取同一张图。
- 旧 HTML 中未加引号的 SmartBear 链接属性在渲染时修复；REST 对照表的 JSON 直引号不接受自动弯引号替换。

更新时若章节结构或图片路径改变，脚本会停止，必须先核对结构。图中文字与外部链接语言不做翻译。

## 站内解答与多级目录

站点包含原主文档的 29 章、8 篇上游已有中文解答，以及 6 篇面向对象 Notebook 的中文阅读版，另有 1 篇明确署名的本站环形数组解答。题目目录可展开到每一篇解答，解答内部仍保留完整的步骤与小节。

原始中文解答与英文 Notebook 存放在 `solutions/`，不直接编辑。`translations/object-oriented.zh.json` 仅保存 Notebook 说明的中文翻译；Notebook 代码、输出由脚本逐字保留，不执行。环形数组由本站另行补充，源稿保存在 `src/data/system-design-supplements/circular-array.md`，以 `siteSupplement` 区分来源。上游快照不变；生成时仅将该题的待解决入口改成明确标注的本站解答链接。

`scripts/system-design-solutions.mjs` 管理解答来源、图片、译文与路径映射。英文 README 链接优先指向对应站内中文解答；解答中的基础知识点引用与其他题目引用也指向站内。3 份 Anki 卡堆提供本站下载。GitHub 作者、版权来源、贡献与讨论入口，以及第三方延伸阅读保留外部链接。

构建校验会拒绝正文中仍指向上游 README 或 solutions 的内容链接，同时检查所有正文、代码块、图示、小节与搜索结果链接。旧 HTML 的未加引号 href 属性在生成时补齐，保留原链接文字与未修改的上游快照。

## 英文版补译与校订

2026-10-26 对比同一上游 commit 的英文主文档和 8 篇英文解答。英文快照分别保存为 `README.md`；中文原始文件仍逐字保留。站点展示由中文快照、`translations/english-updates.json` 中的补译校订，以及独立的本站环形数组解答共同构成。

补译包含可用率量化、遗漏的 CDN 适用场景、题解步骤和参考资料；校订包含已核实的术语、单位、读写吞吐量、代码与配图差异。每条修改记录英文证据、中文匹配片段与预期次数。同步时如果上游证据或匹配目标改变，会停止并要求重新审阅。`manifest.sha256` 仍标识原始中文快照，`renderedSha256` 标识补译后的主文档，`englishRevision` 保存英文快照 hash 和校订清单。

`npm run system-design:english-check` 检查 9 份英文文档中的参考入口覆盖、关键补译和计算；构建已包含这一检查。标题、图片、正文、代码、站内锚点和搜索仍由原有构建校验覆盖。允许的展示差异包括移除多语言切换、来源标记、明确注明的英文原文错误修正。详细范围见 `ENGLISH-COMPARISON.md`。

## 本站进阶专题

`src/data/system-design-supplements/` 新增 MapReduce、一致性哈希和 Scatter-gather 三篇参考章节，按原理、具体例子与取舍组织，并引用原始论文或官方资料。它们与环形数组一样使用 `siteSupplement`，不归入原作者译文。原“正在完善中”页面保留地址并作为“进阶专题”目录；原中文快照中把 Scatter-gather 译成 DMA 控制器的错误仅在展示入口纠正。

`python3 scripts/check-system-design-supplements.py` 直接提取三篇文章的 Python 代码，检查分片汇总不变性、哈希环增删节点的映射范围、截止时间与重复回复处理，以及全局 Top K 的条件。示例为教学模型，不是分布式运行时或性能验收。MapReduce 和 Scatter-gather 的流程图在构建时编译为静态 SVG。
