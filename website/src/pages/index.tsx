// @ts-ignore docusaurus generated types may not be in tsconfig include
import Link from '@docusaurus/Link';
// @ts-ignore docusaurus generated types may not be in tsconfig include
import Layout from '@theme/Layout';
// @ts-ignore docusaurus theme component types may not be in local ts config
import CodeBlock from '@theme/CodeBlock';
import clsx from 'clsx';
import React, { useState } from 'react';

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
  { title: 'Zero Config', desc: 'Drop in & generate – sensible defaults for all stacks.', icon: '⚡' },
  { title: 'Typed & Safe', desc: 'Dual exports: perfect Prisma typing + full Zod method freedom.', icon: '🛡️' },
  { title: 'Pure Models', desc: 'Lean model schemas with naming presets & relation control.', icon: '🧱' },
  { title: 'Smart Modes', desc: 'Full, minimal, custom – optimize output & performance.', icon: '🎚️' },
  { title: 'Configurable', desc: 'Heuristics + explicit emit flags, variants, exclusions.', icon: '🧩' },
  { title: 'Bytes & JSON', desc: 'Specialized mapping (Uint8Array / base64, depth guards).', icon: '🧬' },
];

const installCmds = {
  npm: 'npm install prisma-zod-generator zod @prisma/client',
  pnpm: 'pnpm add prisma-zod-generator zod @prisma/client',
  yarn: 'yarn add prisma-zod-generator zod @prisma/client'
};

const Home: React.FC = () => {
  const [pkgMgr, setPkgMgr] = useState<'npm' | 'pnpm' | 'yarn'>('npm');
  return (
    <Layout title="Prisma Zod Generator" description="Typed, configurable Zod schemas from your Prisma schema">
  {/* Top ribbon removed per request */}
      <div className={clsx('hero hero--dark','pz-hero')} style={{
        background: 'radial-gradient(circle at 20% 30%, rgba(99,102,241,.35), transparent 60%), radial-gradient(circle at 80% 70%, rgba(236,72,153,.30), transparent 55%), linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%)',
        position:'relative'
      }}>
        <div style={{pointerEvents:'none', position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(255,255,255,.06), rgba(255,255,255,0))'}} />
  <div className="pz-hero-grid" style={{maxWidth: 1180, margin: '0 auto', position:'relative', zIndex:2, display:'grid', gap:'3.2rem', alignItems:'center'}}>
          <div>
            <h1 className="pz-hero-title" style={{fontSize: '3.4rem', margin: '0 0 1rem', fontWeight: 700, letterSpacing:'-.5px', lineHeight:1.05, wordBreak:'keep-all', hyphens:'manual'}}>
              Prisma → Zod, Instantly
            </h1>
            <p style={{fontSize: '1.25rem', opacity: 0.92, maxWidth: 760, lineHeight:1.35}}>
              Generate type-safe validation & inference schemas directly from your Prisma schema. Dual exports, pure models, modes, smart emission & filtering — tuned for DX and performance.
            </p>
            <div className="pz-hero-buttons" style={{marginTop: '1.6rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap'}}>
              <Link className="pz-btn pz-btn-primary" to="/docs/next/intro/quick-start">
                <span className="pz-btn-icon" aria-hidden="true">🚀</span>
                <span>Get Started</span>
              </Link>
              <Link className="pz-btn pz-btn-secondary" to="/docs/next/config/precedence">
                <span className="pz-btn-icon" aria-hidden="true">⚙️</span>
                <span>Config Deep Dive</span>
              </Link>
              <Link className="pz-btn pz-btn-ghost" to="https://github.com/omar-dulaimi/prisma-zod-generator" aria-label="GitHub repository (opens in new tab)" target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{marginRight:'.4rem'}}>
                  <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <span>GitHub</span>
              </Link>
            </div>
            <div className="pz-hero-metrics" style={{marginTop:'1.1rem', display:'flex', gap:'0.55rem', flexWrap:'wrap', alignItems:'center'}}>
              <span className="pz-badge" aria-label="Latest version">v1.8.0</span>
              <span className="pz-badge" aria-label="Monthly downloads">23k/mo</span>
              <span className="pz-badge" aria-label="GitHub stars">★ 619</span>
            </div>
            <div className="pz-hero-sponsor" style={{marginTop:'0.85rem'}}>
              <Link className="button button--sm" style={{background:'linear-gradient(90deg,#f472b6,#fb7185)', color:'#111', border:'none', fontWeight:600}} to="https://github.com/sponsors/omar-dulaimi">❤️ Sponsor Development</Link>
            </div>
            <div style={{marginTop:'1.6rem'}}>
              <div style={{display:'flex', gap:'.75rem', flexWrap:'wrap'}}>
                {(['npm','pnpm','yarn'] as const).map(m => (
                  <button key={m} onClick={()=>setPkgMgr(m)} style={{
                    cursor:'pointer',
                    background: m===pkgMgr ? 'var(--ifm-color-primary)' : 'rgba(255,255,255,.08)',
                    border:'1px solid rgba(255,255,255,.15)',
                    color:'#fff',
                    padding:'.35rem .9rem',
                    borderRadius:8,
                    fontSize:'.75rem',
                    fontWeight:600,
                    letterSpacing:'.5px',
                    textTransform:'uppercase'
                  }}>{m}</button>
                ))}
              </div>
              <CodeBlock language="bash" title={`Install (${pkgMgr})`}>
{installCmds[pkgMgr]}
              </CodeBlock>
            </div>
          </div>
          <div className="pz-hero-side" style={{display:'flex', flexDirection:'column', gap:'1.2rem'}}>
            <div style={{backdropFilter:'blur(7px)', background:'linear-gradient(135deg,rgba(255,255,255,.10),rgba(255,255,255,.03))', border:'1px solid rgba(255,255,255,.15)', borderRadius:18, padding:'0.9rem 1.05rem', boxShadow:'0 8px 28px -6px rgba(0,0,0,.35)'}}>
              <CodeBlock language="ts" title="Usage">
{heroCode}
              </CodeBlock>
            </div>
            <div style={{fontSize:'.7rem', opacity:.65, textAlign:'right'}}>DX-first • Tree-shakeable • Multi-provider</div>
          </div>
        </div>
      </div>
  <main style={{padding: '3.2rem 1.5rem 4rem', maxWidth: 1180, margin: '0 auto'}}>
        <section style={{marginBottom:'3.5rem'}}>
          <div className="pz-feature-grid" style={{display:'grid', gap:'1.75rem', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))'}}>
          {features.map(f => (
            <div key={f.title} style={{background: 'var(--ifm-card-background-color)', padding: '1.1rem 1.1rem 1.25rem', borderRadius: 14, boxShadow: '0 4px 18px rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden'}}>
              <div style={{fontSize: '1.6rem', lineHeight: '1.2'}}>{f.icon}</div>
              <h3 style={{margin: '0.6rem 0 0.4rem', fontSize: '1.05rem'}}>{f.title}</h3>
              <p style={{margin: 0, fontSize: '.85rem', opacity: .85}}>{f.desc}</p>
            </div>
          ))}
          </div>
          <div style={{marginTop:'2.5rem', display:'grid', gap:'1.5rem', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))'}}>
            <div style={{border:'1px solid var(--ifm-color-emphasis-300)', borderRadius:16, padding:'1.25rem 1.2rem', background:'linear-gradient(135deg,rgba(99,102,241,.09),rgba(236,72,153,.07))'}}>
              <h3 style={{marginTop:0, fontSize:'1rem'}}>Why Sponsor?</h3>
              <ul style={{paddingLeft:'1.1rem', margin:'0 0 .75rem', fontSize:'.78rem', lineHeight:1.45}}>
                <li>Faster fixes & regression triage</li>
                <li>Continuous Prisma version tracking</li>
                <li>Advanced features & performance work</li>
                <li>Expanded docs & examples</li>
              </ul>
              <Link className="button button--sm button--primary" to="https://github.com/sponsors/omar-dulaimi">Become a Sponsor</Link>
            </div>
            <div style={{border:'1px solid var(--ifm-color-emphasis-300)', borderRadius:16, padding:'1.25rem 1.2rem', background:'linear-gradient(135deg,rgba(34,197,94,.10),rgba(56,189,248,.08))'}}>
              <h3 style={{marginTop:0, fontSize:'1rem'}}>DX Highlights</h3>
              <p style={{fontSize:'.78rem', margin:'0 0 .6rem'}}>Dual exports, lean pure models, heuristic emission, single-file bundling, depth-aware JSON.</p>
              <Link className="button button--sm button--secondary" to="/docs/next/usage-patterns">See Patterns</Link>
            </div>
          </div>
        </section>
        <section style={{display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '3rem', alignItems: 'start', flexWrap: 'wrap'}}>
          <div>
            <h2 style={{fontSize: '1.95rem'}}>Fast Adoption</h2>
            <p>Install, add a generator block, and <code>prisma generate</code>. Minimal mode gives instant lean output; switch to full/custom when you need depth.</p>
            <ul style={{fontSize: '.9rem', lineHeight: 1.5}}>
              <li>Dual schema export strategy (typed + method-friendly)</li>
              <li>Pure model naming presets & overrides</li>
              <li>Emission heuristics with explicit overrides</li>
              <li>Single-file bundling for serverless / edge</li>
            </ul>
          </div>
          <div>
            <CodeBlock language="ts">{heroCode}</CodeBlock>
          </div>
        </section>
        <section style={{marginTop: '4rem'}}>
          <h2 style={{fontSize: '1.95rem'}}>Why It Stays Maintainable</h2>
          <p style={{maxWidth: 860}}>Focused logs, strict types, test matrix across providers, and opt-in advanced features keep complexity under control. Tailor output granularity without forked pipelines.</p>
          <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem'}}>
            <Link className="button button--primary" to="/docs/next/usage-patterns">Usage Patterns</Link>
            <Link className="button button--secondary" to="/docs/next/reference/faq">FAQ</Link>
            <Link className="button button--outline" to="/docs/next/reference/logging-debug">Debug Logging</Link>
          </div>
        </section>
        <section style={{marginTop: '5rem'}}>
            <div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 16, padding: '1.75rem 1.5rem', background: 'linear-gradient(90deg,rgba(99,102,241,.08),rgba(236,72,153,.08))'}}>
              <h2 style={{marginTop: 0}}>Support & Sustainability ❤️</h2>
              <p style={{marginBottom: '1rem', maxWidth: 760}}>If this generator saves you hours, consider sponsoring to accelerate fixes & new capabilities.</p>
              <Link className="button button--primary button--sm" to="https://github.com/sponsors/omar-dulaimi">Sponsor on GitHub</Link>
            </div>
        </section>
      </main>
    </Layout>
  );
};

export default Home;
