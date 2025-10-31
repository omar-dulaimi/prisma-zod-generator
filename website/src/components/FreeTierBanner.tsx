import Link from '@docusaurus/Link';
import styles from './FreeTierBanner.module.css';

export default function FreeTierBanner(): JSX.Element {
  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <span className={styles.coreBadge}>Core</span>
            <span className={styles.freeLabel}>Free Forever</span>
          </h3>
          <p className={styles.description}>
            Everything you need to get started • MIT Licensed • Unlimited developers
          </p>
        </div>

        <div className={styles.features}>
          <div className={styles.feature}>✅ Prisma → Zod generation</div>
          <div className={styles.feature}>✅ Schema variants</div>
          <div className={styles.feature}>✅ Multi-provider support</div>
          <div className={styles.feature}>✅ Zod v4 formats</div>
          <div className={styles.feature}>✅ Community support</div>
        </div>

        <div className={styles.cta}>
          <Link className="button button--primary button--md" to="/docs/intro/quick-start">
            Get Started Free
          </Link>
          <Link
            className={`button button--outline button--secondary button--md ${styles.outlineButton}`}
            to="/docs/features/overview"
          >
            View All Features
          </Link>
        </div>
      </div>
    </div>
  );
}
