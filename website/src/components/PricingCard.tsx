import React from 'react';
import Link from '@docusaurus/Link';
import { GitHubIcon, XIcon } from './Icons';
import styles from './PricingCard.module.css';

export interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  bestFor?: string;
  features: string[];
  cta: string;
  ctaLink: string;
  highlighted?: boolean;
  popular?: boolean;
}

export default function PricingCard({
  name,
  price,
  period,
  description,
  bestFor,
  features,
  cta,
  ctaLink,
  highlighted = false,
  popular = false,
}: PricingCardProps): JSX.Element {
  return (
    <div className={`${styles.pricingCard} ${highlighted ? styles.highlighted : ''}`}>
      {popular && <div className={styles.badge}>Most Popular</div>}

      <div className={styles.header}>
        <h3 className={styles.name}>{name}</h3>
        <div className={styles.priceContainer}>
          <span className={styles.price}>{price}</span>
          {period && <span className={styles.period}>/{period}</span>}
        </div>
        <p className={styles.description}>{description}</p>
        {bestFor && (
          <p className={styles.bestFor}>
            <strong>Best for:</strong> {bestFor}
          </p>
        )}
      </div>

      <Link
        to={ctaLink}
        className={`button ${highlighted ? 'button--primary' : 'button--outline button--primary'} ${styles.cta}`}
      >
        {ctaLink.includes('github.com') && <GitHubIcon />}
        {ctaLink.includes('x.com') && <XIcon />}
        {cta}
      </Link>

      <ul className={styles.features}>
        {features.map((feature, idx) => (
          <li key={idx} className={styles.feature}>
            <span className={styles.checkmark}>✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
