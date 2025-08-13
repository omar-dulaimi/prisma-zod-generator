import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

export default function Home(): JSX.Element {
  return (
    <Layout title="Prisma Zod Generator" description="Typed, configurable Zod schemas from your Prisma schema">
      <main style={{padding: '3rem 1.5rem', maxWidth: 900, margin: '0 auto'}}>
        <h1>Prisma Zod Generator</h1>
        <p>Generate strongly-typed Zod validation schemas directly from your Prisma schema with rich configuration: modes, variants, pure models, filtering, and more.</p>
        <p>
          <Link className="button button--primary" to="/prisma-zod-generator/docs/intro/what-is">
            Get Started
          </Link>
        </p>
      </main>
    </Layout>
  );
}
