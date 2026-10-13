// Run in the workflow with its existing provider configuration, before publishing.
import assert from 'node:assert/strict';
import { generateCompanyReview } from '../scripts/ai-company-weekly.mjs';

const text = 'On October 12, 2026, Example raised $100 million in a Series A round at a $500 million valuation. Jane Smith is the founder. The assistant can be reached by text, phone, and email.';
const company = { id: 'example', sources: [{ id: 'announcement', publishedAt: '2026-10-12' }], sections: [{ id: 'funding', rows: [{ text: '2026年10月12日，Example 完成1亿美元A轮融资，估值5亿美元。', kind: 'disclosed' }] }, { id: 'product', rows: [{ text: '创始人为 Jane Smith，助手可以通过短信或电话使用。', kind: 'disclosed' }] }] };
const payload = { company, period: { start: '2026-10-06', end: '2026-10-13' }, materials: [{ sourceId: 'announcement', title: 'Company announcement', text, publishedAt: '2026-10-12' }], proposed: { companyId: 'example', changes: [], confirmed: [{ sectionId: 'funding', rowIndex: 0, evidence: [{ sourceId: 'announcement', quote: text }] }, { sectionId: 'product', rowIndex: 0, evidence: [{ sourceId: 'announcement', quote: text }] }], analysisReviewed: [], events: [] } };
const supported = await generateCompanyReview('verify', payload);
assert.equal(supported.approved, true, `正常翻译与金额概括被误拒绝：${supported.reason}`);
const wrong = structuredClone(payload);
wrong.proposed.changes = [{ sectionId: 'funding', rowIndex: 0, text: 'Example 已实现1亿美元收入。', kind: 'disclosed', sources: ['announcement'], asOf: '2026-10-12', evidence: [{ sourceId: 'announcement', quote: text }] }];
const unsupported = await generateCompanyReview('verify', wrong);
assert.equal(unsupported.approved, false, '把融资当收入的错误被放行');
console.log('真实模型核对校准通过：接受有依据的翻译，拒绝融资与收入混淆。');
