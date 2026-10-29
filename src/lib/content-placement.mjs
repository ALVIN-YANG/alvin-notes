/** Dedicated book chapters stay searchable, but do not enter the blog feed. */
const handbookDirectories = ['app-stores', 'system-design', 'phoenix', 'interview', 'ai-infra'];
export function isHandbookDocument(id) {
  const normalized = id.replace(/^\/+/, '');
  return handbookDirectories.some(directory => normalized === directory || normalized.startsWith(`${directory}/`));
}
