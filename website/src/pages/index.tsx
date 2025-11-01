// @ts-ignore docusaurus generated types may not be in tsconfig include
import Link from '@docusaurus/Link';
// @ts-ignore docusaurus generated types may not be in tsconfig include
import Layout from '@theme/Layout';
import clsx from 'clsx';
import React from 'react';
import metrics from '../data/metrics.json';

const features: Array<{ title: string; desc: string; icon: string; details: string[] }> = [
  {
    title: 'Schema Generation',
    desc: 'Auto-generate Zod schemas from your Prisma schema with multiple output modes.',
    icon: '⚡',
    details: [
      'Minimal, Full, and Custom generation modes',
      'Schema variants (input, result, pure models)',
      'Decimal & DateTime type handling',
      'CRUD operation schemas',
    ],
  },
  {
    title: 'Customization',
    desc: 'Flexible configuration to match your project structure and naming conventions.',
    icon: '🎨',
    details: [
      'Custom naming patterns and presets',
      'File organization control',
      'Selective schema generation',
      'Extensive configuration options',
    ],
  },
  {
    title: 'Type Safety',
    desc: 'Full TypeScript integration with runtime validation powered by Zod.',
    icon: '🛡️',
    details: [
      'Zod v4 ISO format methods',
      'Strict mode enforcement',
      'Complete type checking',
      'Runtime validation',
    ],
  },
  {
    title: 'Performance',
    desc: 'Optimized output for production with minimal bundle size.',
    icon: '🚀',
    details: [
      'Fast schema generation',
      'Tree shaking support',
      'Selective imports',
      'Optimized bundles',
    ],
  },
];

const proFeatureCategories: Array<{
  category: string;
  icon: string;
  description: string;
  features: Array<{ title: string; desc: string; icon: string; to: string }>;
}> = [
  {
    category: 'Security & Governance',
    icon: '🔒',
    description: 'Enterprise-grade security, compliance, and schema governance',
    features: [
      {
        title: 'Policies & Redaction',
        icon: '🛡️',
        desc: 'RBAC, ABAC, and PII protection helpers',
        to: '/docs/features/policies',
      },
      {
        title: 'Drift Guard',
        icon: '🚨',
        desc: 'Breaking change detection and CI integration',
        to: '/docs/features/guard',
      },
      {
        title: 'PostgreSQL RLS',
        icon: '🐘',
        desc: 'Row-level security and tenant isolation',
        to: '/docs/features/postgres-rls',
      },
      {
        title: 'Contract Testing',
        icon: '🧪',
        desc: 'Pact.js integration for consumer-driven contracts',
        to: '/docs/features/contracts',
      },
    ],
  },
  {
    category: 'Developer Experience',
    icon: '✨',
    description: 'Accelerate development with powerful integrations and tooling',
    features: [
      {
        title: 'Server Actions Pack',
        icon: '⚡',
        desc: 'Next.js typed server actions with validation',
        to: '/docs/features/server-actions',
      },
      {
        title: 'Form UX Pack',
        icon: '📝',
        desc: 'React Hook Form and UI library integration',
        to: '/docs/features/forms',
      },
      {
        title: 'API Docs Pack',
        icon: '📄',
        desc: 'OpenAPI v3 and Swagger UI generation',
        to: '/docs/features/api-docs',
      },
      {
        title: 'Data Factories',
        icon: '🏭',
        desc: 'Test data generation with realistic values',
        to: '/docs/features/factories',
      },
    ],
  },
  {
    category: 'Platform & Scale',
    icon: '🏢',
    description: 'Build and scale production applications with confidence',
    features: [
      {
        title: 'SDK Publisher',
        icon: '📦',
        desc: 'Generate typed client SDKs with retry logic',
        to: '/docs/features/sdk',
      },
      {
        title: 'Multi-Tenant Kit',
        icon: '🏷️',
        desc: 'Tenant isolation and context management',
        to: '/docs/features/multi-tenant',
      },
      {
        title: 'Performance Pack',
        icon: '🚄',
        desc: '3x faster validation with streaming and caching',
        to: '/docs/features/performance',
      },
    ],
  },
];

const Home: React.FC = () => {
  return (
    <Layout
      title="Prisma Zod Generator"
      description="Typed, configurable Zod schemas from your Prisma schema"
    >
      <div
        className={clsx('hero hero--dark', 'pz-hero')}
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgba(99,102,241,.35), transparent 60%), radial-gradient(circle at 80% 70%, rgba(236,72,153,.30), transparent 55%), linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%)',
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Animated background particles */}
        <div
          className="pz-particles"
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <div
            className="pz-particle"
            style={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              background: 'rgba(99,102,241,0.4)',
              borderRadius: '50%',
              top: '20%',
              left: '10%',
              animation: 'float 6s ease-in-out infinite',
            }}
          ></div>
          <div
            className="pz-particle"
            style={{
              position: 'absolute',
              width: '6px',
              height: '6px',
              background: 'rgba(236,72,153,0.3)',
              borderRadius: '50%',
              top: '60%',
              right: '15%',
              animation: 'float 8s ease-in-out infinite reverse',
            }}
          ></div>
          <div
            className="pz-particle"
            style={{
              position: 'absolute',
              width: '3px',
              height: '3px',
              background: 'rgba(34,197,94,0.4)',
              borderRadius: '50%',
              top: '80%',
              left: '20%',
              animation: 'float 7s ease-in-out infinite',
            }}
          ></div>
        </div>
        <div
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(255,255,255,.06), rgba(255,255,255,0))',
          }}
        />
        <div
          className="pz-hero-grid"
          style={{
            maxWidth: 900,
            margin: '0 auto',
            position: 'relative',
            zIndex: 2,
            padding: '2rem 1.5rem',
            textAlign: 'center',
          }}
        >
          <div>
            <Link
              className="pz-hero-badge"
              to="https://omar-dulaimi.github.io/prisma-zod-generator/pricing"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Start 14-day Pro trial (opens in new tab)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '50px',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#a5b4fc',
                marginBottom: '1.5rem',
                backdropFilter: 'blur(8px)',
                textDecoration: 'none',
                transition: 'transform .15s ease, box-shadow .15s ease',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  background: '#22c55e',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite',
                }}
              ></span>
              <span style={{ display: 'inline-flex', gap: '.5rem', alignItems: 'center' }}>
                TypeScript • Zod • Prisma <span style={{ opacity: 0.8 }}>— Try Pro →</span>
              </span>
            </Link>
            <h1
              className="pz-hero-title"
              style={{
                fontSize: '4rem',
                margin: '0 0 1.5rem',
                fontWeight: 800,
                letterSpacing: '-1px',
                lineHeight: 1.1,
                wordBreak: 'keep-all',
                hyphens: 'manual',
                background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textAlign: 'center',
              }}
            >
              All-in-one Prisma → Zod workflow for real teams.
            </h1>
            <p
              style={{
                fontSize: '1.375rem',
                opacity: 0.9,
                maxWidth: 800,
                lineHeight: 1.4,
                marginBottom: '2rem',
                textAlign: 'center',
                margin: '0 auto 2rem',
              }}
            >
              Starter to Enterprise: automate validation, docs, redaction, and drift guard while
              staying in your Prisma flow.
            </p>
            <div
              className="pz-hero-buttons"
              style={{
                marginTop: '2rem',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Link
                className="pz-btn pz-btn-primary"
                to="/docs/intro/quick-start"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  boxShadow:
                    '0 8px 25px -8px rgba(79, 70, 229, 0.6), 0 0 0 1px rgba(255,255,255,0.1)',
                  transform: 'translateY(0)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="pz-btn-icon" aria-hidden="true">
                  🚀
                </span>
                <span>Get Started</span>
              </Link>
              <Link
                className="pz-btn pz-btn-secondary"
                to="https://omar-dulaimi.github.io/prisma-zod-generator/pricing"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  borderColor: 'rgba(124,58,237,.4)',
                }}
              >
                ✨ Start 14‑day Trial
              </Link>
              <Link className="pz-btn pz-btn-secondary" to="/docs/config/precedence">
                <span className="pz-btn-icon" aria-hidden="true">
                  ⚙️
                </span>
                <span>Configuration</span>
              </Link>
              <Link
                className="pz-btn pz-btn-ghost"
                to="https://github.com/omar-dulaimi/prisma-zod-generator"
                aria-label="GitHub repository (opens in new tab)"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                  style={{ marginRight: '.4rem' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                  />
                </svg>
                <span>GitHub</span>
              </Link>
            </div>
            <div
              className="pz-hero-metrics"
              style={{
                marginTop: '2rem',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="pz-metric"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>📦</span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#22c55e' }}>
                    {metrics.version}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Latest</div>
                </div>
              </div>
              <div
                className="pz-metric"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>📈</span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#3b82f6' }}>
                    {metrics.weeklyDownloads}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Weekly Downloads</div>
                </div>
              </div>
              <div
                className="pz-metric"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>⭐</span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f59e0b' }}>
                    {metrics.githubStars}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>GitHub Stars</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <main style={{ padding: '4rem 1.5rem 5rem', maxWidth: 1200, margin: '0 auto' }}>
        <section style={{ marginBottom: '5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2
              style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                margin: '0 0 1rem',
                background: 'linear-gradient(135deg, var(--ifm-font-color-base) 0%, #6366f1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Why Choose Prisma Zod Generator?
            </h2>
            <p style={{ fontSize: '1.25rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
              Built with modern development in mind, featuring everything you need for
              production-ready applications.
            </p>
          </div>
          <div
            className="pz-feature-grid"
            style={{
              display: 'grid',
              gap: '2rem',
              gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
            }}
          >
            {features.map((f, i) => (
              <div
                key={f.title}
                className="pz-feature-card"
                style={{
                  background:
                    'linear-gradient(135deg, var(--ifm-card-background-color) 0%, rgba(255,255,255,0.02) 100%)',
                  padding: '2rem',
                  borderRadius: '20px',
                  border: '1px solid var(--ifm-color-emphasis-200)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: `linear-gradient(90deg, ${i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#22c55e' : '#f59e0b'}, transparent)`,
                  }}
                ></div>
                <div
                  className="pz-feature-icon"
                  style={{
                    fontSize: '2.5rem',
                    lineHeight: '1.2',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '60px',
                    height: '60px',
                    background: `linear-gradient(135deg, ${i % 3 === 0 ? 'rgba(99,102,241,0.1)' : i % 3 === 1 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)'}, transparent)`,
                    borderRadius: '16px',
                    border: `1px solid ${i % 3 === 0 ? 'rgba(99,102,241,0.2)' : i % 3 === 1 ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: '700' }}>
                  {f.title}
                </h3>
                <p
                  style={{
                    margin: '0 0 1rem',
                    fontSize: '0.95rem',
                    opacity: 0.85,
                    lineHeight: 1.6,
                  }}
                >
                  {f.desc}
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  {f.details.map((detail, idx) => (
                    <li key={idx} style={{ marginBottom: '0.5rem', lineHeight: 1.5 }}>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* Pro Features section */}
          <section className="pz-pro-section" style={{ marginTop: '4rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                className="pz-pro-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  padding: '.5rem 1rem',
                  borderRadius: 9999,
                  fontWeight: 600,
                }}
              >
                <span>✨</span> Power Up with Pro Features
              </div>
              <h2
                className="pz-pro-heading"
                style={{ fontSize: '2rem', fontWeight: 800, margin: '1rem 0 .5rem' }}
              >
                Ship faster with batteries included
              </h2>
              <p style={{ opacity: 0.8, margin: 0 }}>
                SDKs, Forms, API Docs, Policies, RLS, Multi‑tenant, Performance, Factories, Guard,
                Contracts, Server Actions.
              </p>
            </div>
            {proFeatureCategories.map((category, catIdx) => (
              <div key={category.category} style={{ marginBottom: '3rem' }}>
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{category.icon}</span>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                      {category.category}
                    </h3>
                  </div>
                  <p style={{ opacity: 0.8, margin: 0, fontSize: '1rem' }}>
                    {category.description}
                  </p>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gap: '1rem',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                  }}
                >
                  {category.features.map((f) => (
                    <Link
                      key={f.title}
                      to={f.to}
                      className="pz-pro-card"
                      style={{
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit',
                        border: '1px solid var(--ifm-color-emphasis-200)',
                        borderRadius: 16,
                        padding: '1.25rem',
                        background:
                          'linear-gradient(135deg, var(--ifm-card-background-color) 0%, rgba(255,255,255,0.02) 100%)',
                        transition: 'transform .15s ease, box-shadow .15s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{f.icon}</div>
                      <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                        {f.title}
                      </div>
                      <div style={{ opacity: 0.8, fontSize: '.95rem', lineHeight: 1.5 }}>
                        {f.desc}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link className="pz-btn pz-btn-secondary" to="/docs/features/overview">
                Explore all Pro Features →
              </Link>
            </div>
          </section>
        </section>
        <section
          className="pz-maintainable-section"
          style={{ marginTop: '6rem', textAlign: 'center' }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '50px',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#6366f1',
              marginBottom: '1.5rem',
            }}
          >
            <span>🛠️</span> Built to Last
          </div>
          <h2
            style={{
              fontSize: '2.25rem',
              fontWeight: '800',
              margin: '0 0 1.5rem',
              background: 'linear-gradient(135deg, var(--ifm-font-color-base) 0%, #6366f1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Production-Ready & Maintainable
          </h2>
          <p
            style={{
              fontSize: '1.25rem',
              maxWidth: '800px',
              margin: '0 auto 3rem',
              lineHeight: 1.6,
              opacity: 0.9,
            }}
          >
            Focused logs, strict types, comprehensive test matrix across providers, and opt-in
            advanced features keep complexity under control. Tailor output granularity without
            forked pipelines.
          </p>
          <div
            className="pz-action-buttons"
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Link
              className="pz-btn pz-btn-primary"
              to="/docs/usage-patterns"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              }}
            >
              📚 Usage Patterns
            </Link>
            <Link className="pz-btn pz-btn-secondary" to="/docs/reference/faq">
              ❓ FAQ
            </Link>
            <Link className="pz-btn pz-btn-ghost" to="/docs/reference/logging-debug">
              🐛 Debug Logging
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Home;
