import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import PricingCard from '../components/PricingCard';
import FreeTierBanner from '../components/FreeTierBanner';
import { GitHubIcon, XIcon } from '../components/Icons';
import styles from './pricing.module.css';

const tiers = [
  {
    name: 'Starter',
    price: '$69',
    period: 'year',
    description: 'Ship features faster with Server Actions & Forms',
    bestFor: 'Solo developers & side projects',
    features: [
      'Everything in Core',
      'Server Actions Pack (Next.js)',
      'Form UX Pack (React Hook Form + UI libraries)',
      'Basic drift detection',
      'Private Discord channel (best-effort responses)',
      '1 developer',
    ],
    cta: 'Purchase on GitHub',
    ctaLink: 'https://github.com/sponsors/omar-dulaimi',
    highlighted: false,
    popular: false,
  },
  {
    name: 'Professional',
    price: '$199',
    period: 'year',
    description: 'Production-ready with security & quality gates',
    bestFor: 'Production teams (up to 5 developers)',
    features: [
      'Everything in Starter',
      'Policies & Redaction Pack',
      'Drift Guard (CI integration)',
      'PostgreSQL RLS Pack',
      'Performance Pack (3x faster validation)',
      'SDK Publisher',
      'Private Discord channel (priority triage)',
      'Up to 5 developers',
    ],
    cta: 'Purchase on GitHub',
    ctaLink: 'https://github.com/sponsors/omar-dulaimi',
    highlighted: true,
    popular: true,
  },
  {
    name: 'Business',
    price: '$599',
    period: 'year',
    description: 'Scale with platform & integration features',
    bestFor: 'Growing companies (unlimited developers)',
    features: [
      'Everything in Professional',
      'Contract Testing Pack (Pact.js)',
      'API Docs Pack (OpenAPI + Swagger)',
      'Data Factories',
      'Priority support response times',
      'Unlimited developers',
    ],
    cta: 'Purchase on GitHub',
    ctaLink: 'https://github.com/sponsors/omar-dulaimi',
    highlighted: false,
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Enterprise-grade for serious SaaS businesses',
    bestFor: 'Large organizations with complex requirements',
    features: [
      'Everything in Business',
      'Multi-Tenant Kit',
      'Quarterly roadmap & architecture reviews',
      'Co-developed feature or integration pack',
      'White-glove onboarding playbooks',
      'Unlimited developers',
    ],
    cta: 'Contact on X',
    ctaLink: 'https://x.com/omardulaimidev',
    highlighted: false,
    popular: false,
  },
];

const faqs = [
  {
    question: 'How do I purchase a paid plan?',
    answer: `Visit my GitHub Sponsors page at github.com/sponsors/omar-dulaimi and select the tier that matches your needs. After sponsoring, DM me on X (@omardulaimidev) with your GitHub username to receive your license key.`,
  },
  {
    question: 'How do I get my license after purchasing?',
    answer: `After purchasing through GitHub Sponsors, send me a DM on X (@omardulaimidev) with your GitHub username. I'll send you your license key and setup instructions.`,
  },
  {
    question: 'Can I change plans later?',
    answer: `Yes! You can upgrade or downgrade your GitHub Sponsors tier at any time. Contact me on X (@omardulaimidev) to update your license accordingly.`,
  },
  {
    question: 'Is the Core version really free?',
    answer: `Yes! Core is MIT licensed and completely free forever. No limits on users, projects, or features. Use it for personal projects or in production.`,
  },
  {
    question: 'What payment methods do you accept?',
    answer: `We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and provide invoicing for Enterprise customers.`,
  },
  {
    question: 'Do you offer discounts?',
    answer: `Yes! We offer discounts for educational institutions, non-profits, and multi-year commitments. Reach out to discuss your needs.`,
  },
  {
    question: `What's included in support?`,
    answer: `Core users get the community Discord. Every paid plan includes a private Discord channel; Business and Enterprise add response targets, with Enterprise also getting quarterly roadmap reviews.`,
  },
  {
    question: 'Can I use PZG Pro in open source projects?',
    answer: `The Core version (MIT) can be used in any project. Pro features require a paid license for commercial use, but we're happy to discuss sponsorship for significant open source projects.`,
  },
];

export default function Pricing(): JSX.Element {
  return (
    <Layout
      title="Pricing"
      description="Prisma Zod Generator pricing - Start free, upgrade when you need more. Core is MIT licensed and free forever."
    >
      {/* Hero Section */}
      <div className={styles.pricingHero}>
        <div className="container">
          <h1 className={styles.heroTitle}>Pricing</h1>
          <p className={styles.heroSubtitle}>Start free, upgrade when you need more</p>
          <p className={styles.heroMeta}>
            Core is MIT licensed and free forever • Paid plans start at <strong>$69/year</strong>
          </p>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className={styles.pricingSection}>
        <div className="container">
          {/* Free Tier Banner */}
          <FreeTierBanner />

          {/* Paid Tiers Heading */}
          <h2 className={styles.paidTiersHeading}>Paid Plans</h2>
          <p className={styles.paidTiersSubheading}>
            Purchase on GitHub Sponsors • Contact @omardulaimidev on X for license
          </p>

          {/* Paid Tiers Grid */}
          <div className={styles.pricingGrid}>
            {tiers.map((tier, idx) => (
              <PricingCard key={idx} {...tier} />
            ))}
          </div>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className={styles.comparisonSection}>
        <h2 className={styles.sectionTitle}>Feature Comparison</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Core</th>
                <th>Starter</th>
                <th>Professional</th>
                <th>Business</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.categoryRow}>
                <td colSpan={6}>
                  <strong>Core Schema Generation</strong>
                </td>
              </tr>
              <tr>
                <td>Prisma → Zod</td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>Schema Variants</td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>Multi-Provider Support</td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>

              <tr className={styles.categoryRow}>
                <td colSpan={6}>
                  <strong>Developer Experience</strong>
                </td>
              </tr>
              <tr>
                <td>Server Actions Pack</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>Form UX Pack</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>

              <tr className={styles.categoryRow}>
                <td colSpan={6}>
                  <strong>Security & Governance</strong>
                </td>
              </tr>
              <tr>
                <td>Policies & Redaction</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>Drift Guard (CI)</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>PostgreSQL RLS</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>

              <tr className={styles.categoryRow}>
                <td colSpan={6}>
                  <strong>Performance & Platform</strong>
                </td>
              </tr>
              <tr>
                <td>Performance Pack</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>SDK Publisher</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>Contract Testing</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>API Docs Pack</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>Data Factories</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>

              <tr className={styles.categoryRow}>
                <td colSpan={6}>
                  <strong>Enterprise Features</strong>
                </td>
              </tr>
              <tr>
                <td>Multi-Tenant Kit</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>Quarterly roadmap reviews</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>Custom integration/feature collaboration</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>

              <tr className={styles.categoryRow}>
                <td colSpan={6}>
                  <strong>Support</strong>
                </td>
              </tr>
              <tr>
                <td>Private Discord channel</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
              <tr>
                <td>Priority response targets</td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.noIcon}>✕</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
                <td>
                  <span className={styles.yesIcon}>✓</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className={styles.faqSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqGrid}>
            {faqs.map((faq, idx) => (
              <div key={idx} className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>{faq.question}</h3>
                <p className={styles.faqAnswer}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Purchase CTA Section */}
      <div className={styles.ctaSection} id="purchase">
        <div className="container">
          <h2 className={styles.ctaTitle}>Ready to Get PZG Pro?</h2>
          <p className={styles.ctaSubtitle}>
            Purchase through GitHub Sponsors • Contact on X for your license
          </p>
          <div className={styles.ctaButtons}>
            <Link
              className="button button--primary button--lg"
              to="https://github.com/sponsors/omar-dulaimi"
            >
              <GitHubIcon size={18} />
              Purchase on GitHub Sponsors
            </Link>
            <Link
              className={`button button--outline button--primary button--lg ${styles.ctaOutlineButton}`}
              to="https://x.com/omardulaimidev"
            >
              <XIcon size={18} />
              Contact @omardulaimidev on X
            </Link>
          </div>
          <p className={styles.ctaMeta}>
            After purchasing, DM <Link to="https://x.com/omardulaimidev">@omardulaimidev on X</Link>{' '}
            with your GitHub username to receive your license key
          </p>
        </div>
      </div>
    </Layout>
  );
}
