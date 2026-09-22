# AI 人物志维护

人物正文放在分类 JSON 中，合并入口是 `../ai-people.ts`；分类文件仅为编辑方便，页面使用每条记录的 `category` 筛选。新增人物时保持 `id` 稳定，独立地址为 `/people/<id>/`。

每条简介分三四段：先说是谁、做过什么，再说明代表成果如何起作用，最后补充另一项工作或职业转向。不凑字数，不把管理者写成整个团队成果的独立发明人，也不把文章编辑要求写进人物正文。职务容易变化，优先记录有日期的经历。

收录不设固定上限。优先补齐明确的技术与工程贡献，包括训练推理、检索、Agent 工具、数据与评测；至少有可核查的原始工作或机构资料，不以热度和融资规模代替贡献。显示数量与页面描述从数据自动生成。新分类需要同时登记在数据入口和完整性测试中。

`sources.json` 集中记录大学、机构、本人和原始研究资料。检查链接不仅看 HTTP 状态，还要核对标题、作者、重定向后页面和实际支持的事实。当前完整核对日期由 `reviewedAt` 表示；之后更新时应按实际核对范围维护日期，不能只修改日期。

头像在 `public/images/people/`，署名在 `../ai-people-portraits.json`。维护脚本：

```sh
node scripts/collect-people-portraits.mjs --only=geoffrey-hinton
node scripts/collect-people-portraits.mjs --only=geoffrey-hinton --refresh --inspect
```

下载前必须人工确认 `scripts/people-portrait-sources.json` 中的账号或页面确实对应本人。优先使用有明确开放许可的 Wikimedia 图像；其他公开人物介绍配图不冒充开放授权，保留来源及权利说明。无法确认身份时使用姓名缩写。`--inspect` 只在被忽略的 `docs/` 保存检查用原图；可通过 `position` 或比例坐标 `crop: [left, top, width, height]` 修正裁切。

百科路径必须先检查职业、研究经历与页面主体，再设置 `wikipediaReviewed: true`。同名飞行员、运动员或政治人物不能复用；遇到同名页用 `skipReason` 记录，之后改用确认身份的机构照片。下载超时可为指定人物增加 `--timeout-ms=120000`，不因图片下载成功就跳过身份和裁切检查。

提交前执行 `node --test tests/ai-people.test.mjs`、`npm run fonts:update` 和 `npm run build`。浏览器检查搜索、分类、键盘关闭、浏览器前进后退、独立链接与手机布局。页面遵循站点现有的浅色主题锁定，不单独引入主题切换。卡片与弹窗必须位于 `not-content` 内，避免正文样式干扰 UI。
