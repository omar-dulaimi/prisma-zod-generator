// @ts-ignore docusaurus generated types may not be in tsconfig include
import Link from '@docusaurus/Link';
// @ts-ignore docusaurus generated types may not be in tsconfig include
import Layout from '@theme/Layout';
// @ts-ignore docusaurus theme component types may not be in local ts config
import CodeBlock from '@theme/CodeBlock';
import clsx from 'clsx';
import React, { useState } from 'react';
import metrics from '../data/metrics.json';

const heroCode = `// schema.prisma
generator zod {
  provider = "prisma-zod-generator"
  pureModels = true
  // output optionally supplied by JSON config
}

// usage
import { UserSchema, findManyUserSchema } from './prisma/generated/schemas';
UserSchema.parse(data);`;

const features: Array<{ title: string; desc: string; icon: string }> = [
  {
    title: 'Zero Config',
    desc: 'Drop in & generate – sensible defaults for all stacks.',
    icon: '⚡',
  },
  {
    title: 'Typed & Safe',
    desc: 'Dual exports: perfect Prisma typing + full Zod method freedom.',
    icon: '🛡️',
  },
  {
    title: 'Pure Models',
    desc: 'Lean model schemas with naming presets & relation control.',
    icon: '🧱',
  },
  {
    title: 'Smart Modes',
    desc: 'Full, minimal, custom – optimize output & performance.',
    icon: '🎚️',
  },
  {
    title: 'Configurable',
    desc: 'Heuristics + explicit emit flags, variants, exclusions.',
    icon: '🧩',
  },
  {
    title: 'Bytes & JSON',
    desc: 'Specialized mapping (Uint8Array / base64, depth guards).',
    icon: '🧬',
  },
];

const installCmds = {
  npm: 'npm install prisma-zod-generator zod @prisma/client',
  pnpm: 'pnpm add prisma-zod-generator zod @prisma/client',
  yarn: 'yarn add prisma-zod-generator zod @prisma/client',
};

const Home: React.FC = () => {
  const [pkgMgr, setPkgMgr] = useState<'npm' | 'pnpm' | 'yarn'>('npm');
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
            maxWidth: 1200,
            margin: '0 auto',
            position: 'relative',
            zIndex: 2,
            display: 'grid',
            gap: '4rem',
            alignItems: 'center',
            padding: '2rem 1.5rem',
          }}
        >
          <div>
            <div
              className="pz-hero-badge"
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
              TypeScript • Zod • Prisma
            </div>
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
              Prisma → Zod,
              <br />
              Instantly ⚡
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
              Generate <strong>type-safe validation schemas</strong> directly from your Prisma
              schema. Built for developer experience with dual exports, pure models, smart emission
              & filtering.
            </p>
            <div
              className="pz-hero-buttons"
              style={{
                marginTop: '2rem',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Link
                className="pz-btn pz-btn-primary"
                to="/docs/next/intro/quick-start"
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
              <Link className="pz-btn pz-btn-secondary" to="/docs/next/config/precedence">
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
            <div style={{ marginTop: '2.5rem' }}>
              <div
                style={{
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#a5b4fc',
                }}
              >
                Choose your package manager:
              </div>
              <div
                className="pz-pkg-selector"
                style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}
              >
                {(['npm', 'pnpm', 'yarn'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPkgMgr(m)}
                    style={{
                      cursor: 'pointer',
                      background:
                        m === pkgMgr
                          ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                          : 'rgba(255,255,255,.05)',
                      border:
                        '1px solid ' +
                        (m === pkgMgr ? 'rgba(79, 70, 229, 0.5)' : 'rgba(255,255,255,.1)'),
                      color: '#fff',
                      padding: '0.5rem 1rem',
                      borderRadius: '10px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <CodeBlock language="bash" title={`Install with ${pkgMgr}`}>
                  {installCmds[pkgMgr]}
                </CodeBlock>
              </div>
            </div>
          </div>
          <div
            className="pz-hero-side"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <div
              className="pz-code-showcase"
              style={{
                backdropFilter: 'blur(12px)',
                background: 'linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))',
                border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 20,
                padding: '1.5rem',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background:
                    'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)',
                }}
              ></div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#a5b4fc',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    background: '#22c55e',
                    borderRadius: '50%',
                  }}
                ></span>
                Example Implementation
              </div>
              <CodeBlock language="ts" title="schema.prisma & usage">
                {heroCode}
              </CodeBlock>
            </div>
            <div
              className="pz-features-mini"
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
                fontSize: '0.75rem',
                opacity: 0.8,
              }}
            >
              <span
                className="pz-feature-tag"
                style={{
                  padding: '0.25rem 0.75rem',
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '20px',
                  color: '#a5b4fc',
                  fontWeight: '600',
                }}
              >
                TypeScript Native
              </span>
              <span
                className="pz-feature-tag"
                style={{
                  padding: '0.25rem 0.75rem',
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: '20px',
                  color: '#86efac',
                  fontWeight: '600',
                }}
              >
                Zero Config
              </span>
              <span
                className="pz-feature-tag"
                style={{
                  padding: '0.25rem 0.75rem',
                  background: 'rgba(236,72,153,0.1)',
                  border: '1px solid rgba(236,72,153,0.2)',
                  borderRadius: '20px',
                  color: '#f9a8d4',
                  fontWeight: '600',
                }}
              >
                Multi-provider
              </span>
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
              gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
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
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: '700' }}>
                  {f.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.85, lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
          <div
            className="pz-cta-grid"
            style={{
              marginTop: '4rem',
              display: 'grid',
              gap: '2rem',
              gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
            }}
          >
            <div
              className="pz-cta-card"
              style={{
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '20px',
                padding: '2rem',
                background: 'linear-gradient(135deg,rgba(99,102,241,.08),rgba(236,72,153,.05))',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, #6366f1, #ec4899)',
                }}
              ></div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>💜</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>
                  Support Development
                </h3>
              </div>
              <ul
                style={{
                  paddingLeft: '1.5rem',
                  margin: '0 0 1.5rem',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  listStyleType: 'none',
                  paddingLeft: 0,
                }}
              >
                <li
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ color: '#22c55e' }}>✓</span> Faster fixes & regression triage
                </li>
                <li
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ color: '#22c55e' }}>✓</span> Continuous Prisma version tracking
                </li>
                <li
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ color: '#22c55e' }}>✓</span> Advanced features & performance
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#22c55e' }}>✓</span> Expanded docs & examples
                </li>
              </ul>
              <Link
                className="pz-btn pz-btn-primary"
                to="https://github.com/sponsors/omar-dulaimi"
                style={{
                  background: 'linear-gradient(135deg, #f472b6 0%, #fb7185 100%)',
                  border: 'none',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                ❤️ Become a Sponsor
              </Link>
            </div>
            <div
              className="pz-cta-card"
              style={{
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '20px',
                padding: '2rem',
                background: 'linear-gradient(135deg,rgba(34,197,94,.08),rgba(56,189,248,.05))',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, #22c55e, #3b82f6)',
                }}
              ></div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>🚀</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>
                  Developer Experience
                </h3>
              </div>
              <p
                style={{ fontSize: '0.95rem', margin: '0 0 1.5rem', lineHeight: 1.6, opacity: 0.9 }}
              >
                Dual exports for perfect TypeScript integration, lean pure models with smart naming,
                heuristic emission controls, and single-file bundling for optimal performance.
              </p>
              <Link
                className="pz-btn pz-btn-secondary"
                to="/docs/next/usage-patterns"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                📖 Explore Patterns
              </Link>
            </div>
          </div>
        </section>
        <section
          className="pz-adoption-section"
          style={{
            marginTop: '5rem',
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
            gap: '4rem',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '50px',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#22c55e',
                marginBottom: '1.5rem',
              }}
            >
              <span>⚡</span> Zero to Production
            </div>
            <h2
              style={{
                fontSize: '2.25rem',
                fontWeight: '800',
                margin: '0 0 1.5rem',
                background: 'linear-gradient(135deg, var(--ifm-font-color-base) 0%, #22c55e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Fast Adoption Path
            </h2>
            <p
              style={{ fontSize: '1.125rem', lineHeight: 1.6, marginBottom: '2rem', opacity: 0.9 }}
            >
              Install, add a generator block, and run{' '}
              <code
                style={{
                  padding: '0.25rem 0.5rem',
                  background: 'var(--ifm-code-background)',
                  borderRadius: '6px',
                  fontSize: '0.9em',
                }}
              >
                prisma generate
              </code>
              . Minimal mode gives instant lean output; switch to full/custom when you need depth.
            </p>
            <div
              className="pz-feature-list"
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {[
                'Dual schema export strategy (typed + method-friendly)',
                'Pure model naming presets & overrides',
                'Emission heuristics with explicit overrides',
                'Single-file bundling for serverless / edge',
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: 'var(--ifm-card-background-color)',
                    borderRadius: '12px',
                    border: '1px solid var(--ifm-color-emphasis-200)',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      background: '#22c55e',
                      borderRadius: '50%',
                      color: '#000',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: '0.95rem' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            className="pz-code-example"
            style={{
              background: 'var(--ifm-card-background-color)',
              borderRadius: '20px',
              border: '1px solid var(--ifm-color-emphasis-200)',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <CodeBlock language="ts">{heroCode}</CodeBlock>
          </div>
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
              to="/docs/next/usage-patterns"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              }}
            >
              📚 Usage Patterns
            </Link>
            <Link className="pz-btn pz-btn-secondary" to="/docs/next/reference/faq">
              ❓ FAQ
            </Link>
            <Link className="pz-btn pz-btn-ghost" to="/docs/next/reference/logging-debug">
              🐛 Debug Logging
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Home;
