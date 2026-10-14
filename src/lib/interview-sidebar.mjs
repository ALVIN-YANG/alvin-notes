import { readdirSync, readFileSync } from 'node:fs';
import { interviewModules, getInterviewModule } from './interview-taxonomy.mjs';
import { compareInterviewQuestions } from './interview-evidence.mjs';

// 只改变导航分组；继续使用原文件路径，以保留已发布题目的 URL。
export function buildInterviewSidebar() {
  const questions = ['agent', 'infra'].flatMap(directory => {
    const folder = new URL(`../content/docs/interview/${directory}/`, import.meta.url);
    return readdirSync(folder).filter(file => file.endsWith('.mdx')).map(file => {
      const header = readFileSync(new URL(file, folder), 'utf8').split('---')[1];
      const field = name => header.match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1]?.trim();
      const module = field('  module');
      if (!getInterviewModule(module)) throw new Error(`Invalid interview classification: ${directory}/${file}`);
      return {
        id: `interview/${directory}/${file.slice(0, -4)}`,
        data: { title: field('title'), interview: { module, order: Number(field('  order')) } },
      };
    });
  }).sort(compareInterviewQuestions);
  return interviewModules.map(module => ({
    label: module.label,
    collapsed: true,
    items: [
      { label: '题目与筛选', link: `/interview/?module=${module.id}` },
      ...questions.filter(entry => entry.data.interview.module === module.id)
        .map(entry => ({ label: entry.data.title, link: `/${entry.id}/` })),
    ],
  }));
}
