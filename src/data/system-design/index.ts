import { createKnowledgeMap } from '../create-knowledge-map';
import { systemCaseDomain } from './cases';
import { componentDomains } from './components';
import { foundationDomains } from './foundations';
import { oodAndPracticeDomains } from './ood-and-practice';
import { primerChineseUrl, primerLicenseUrl, primerUrl } from './shared';

const systemDesignKnowledge = createKnowledgeMap({
  slug: 'system',
  updatedAt: '2026-08-31',
  sources: [
    { title: 'System Design Primer', href: primerUrl },
    { title: 'System Design Primer 中文版', href: primerChineseUrl },
    { title: 'CC BY 4.0 许可', href: primerLicenseUrl },
    { title: 'Google SRE Books', href: 'https://sre.google/books/' },
    { title: 'Amazon Builders’ Library', href: 'https://builder.aws.com/learn/topics/builders-library' },
    { title: 'Azure Architecture Center', href: 'https://learn.microsoft.com/en-us/azure/architecture/' },
  ],
  domains: [
    ...foundationDomains,
    ...componentDomains,
    systemCaseDomain,
    ...oodAndPracticeDomains,
  ],
});

export default systemDesignKnowledge;
