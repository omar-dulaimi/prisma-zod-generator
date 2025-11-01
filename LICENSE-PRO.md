# PZG Pro Commercial License Agreement

**Version 1.0 - Effective Date: 2025**

This Commercial License Agreement ("Agreement") is between Omar Dulaimi ("Licensor") and the individual or organization purchasing a PZG Pro license ("Licensee").

## 1. Definitions

**"Pro Features"** refers to all code, features, and functionality contained in:
- The `src/pro/` directory of the private submodule repository
- The obfuscated code in `lib/pro/` directory of the published npm package
- Any features requiring a valid PZG Pro license key

**"Core Features"** refers to all code, features, and functionality licensed under the MIT License (see LICENSE file).

**"License Key"** refers to the unique cryptographic key provided to Licensee upon purchase.

**"Developer Seat"** refers to one individual developer authorized to use Pro Features.

**"Organization"** refers to the legal entity (company, non-profit, or individual) purchasing the license.

## 2. Grant of License

Subject to the terms of this Agreement and payment of applicable fees, Licensor grants Licensee a **non-exclusive, non-transferable, non-sublicensable** license to:

1. Use Pro Features in Licensee's applications
2. Modify Pro Features for internal use only
3. Deploy applications using Pro Features to production

**This license is limited to the number of Developer Seats purchased.**

## 3. License Tiers

### Starter License ($69/year)
- **Developer Seats:** 1
- **Usage:** Individual developers or solo entrepreneurs
- **Support:** Community channels with occasional check-ins
- **Features:** Core generator, Server Actions Pack, Form UX Pack, basic drift detection
- **Restrictions:** Seat limit enforced at 1 developer

### Professional License ($199/year)
- **Developer Seats:** Up to 5
- **Usage:** Production teams that need policy and governance tooling
- **Support:** Prioritized responses via GitHub discussions/issues
- **Features:** Everything in Starter plus Policies & Redaction, Drift Guard, PostgreSQL RLS, Performance Pack, SDK Publisher
- **Restrictions:** None

### Business License ($599/year)
- **Developer Seats:** Unlimited
- **Usage:** Growing companies collaborating across squads
- **Support:** Priority support with expedited responses and preview builds
- **Features:** Everything in Professional plus API Docs Pack, Contract Testing Pack, Data Factories
- **Restrictions:** None

### Enterprise License (Custom Pricing)
- **Developer Seats:** Unlimited
- **Usage:** Enterprise organizations with strategic integration needs
- **Support:** Priority support with roadmap sessions
- **Features:** Everything in Business plus Multi-Tenant Kit, quarterly roadmap reviews, co-developed integration or feature pack
- **Additional:** White-glove onboarding playbooks, optional source code escrow

## 4. Restrictions

Licensee **SHALL NOT**:

1. **Reverse Engineer:** Decompile, deobfuscate, disassemble, or reverse engineer Pro Features
2. **Redistribute:** Distribute, sublicense, sell, or transfer Pro Features to third parties
3. **Share License Keys:** Share, publish, or distribute License Keys
4. **Remove Protection:** Attempt to bypass, remove, or disable license validation
5. **Exceed Seats:** Use Pro Features with more Developer Seats than licensed
6. **Create Derivatives:** Create derivative works based on Pro Features for distribution
7. **Competitive Use:** Use Pro Features to build competing products

## 5. Permitted Uses

Licensee **MAY**:

1. **Internal Use:** Use Pro Features within the licensed Organization
2. **Client Projects:** Build applications for clients using Pro Features (license stays with developer, not client)
3. **Deployment:** Deploy unlimited applications to production
4. **Modifications:** Modify Pro Features for internal use
5. **Backup:** Create backup copies for disaster recovery

## 6. License Validation

Pro Features include **license validation** that:

1. Checks for valid License Key via environment variable (`PZG_LICENSE_KEY`)
2. Validates key authenticity using cryptographic signatures
3. Enforces seat limits and feature access
4. Caches license status locally (30-day offline grace period)

**Tampering with license validation is strictly prohibited** and will result in immediate termination.

## 7. Compliance & Auditing

### 7.1 Self-Reporting
Licensee agrees to accurately report the number of Developer Seats using Pro Features.

### 7.2 Audit Rights
Licensor reserves the right to audit Licensee's use of Pro Features upon reasonable notice (minimum 14 days). Audits may include:
- Reviewing License Key usage
- Inspecting deployment environments
- Requesting documentation of Developer Seat allocation

### 7.3 Audit Findings
If audit reveals under-licensing (more seats than licensed):
- Licensee must purchase additional licenses within 30 days
- Licensee pays for audit costs if under-licensing >20%

## 8. Payment Terms

### 8.1 Annual Subscription
All licenses are **annual subscriptions** billed yearly in advance.

### 8.2 Automatic Renewal
Licenses automatically renew unless canceled 30 days before renewal date.

### 8.3 Refund Policy
- **14-day trial:** No credit card required
- **Refunds:** Available within 30 days of initial purchase if Pro Features are unused
- **Cancellation:** No refunds for mid-term cancellations (access continues until end of period)

### 8.4 Late Payment
Licenses unpaid 14 days after due date will be automatically suspended.

## 9. Ownership & Intellectual Property

### 9.1 Licensor Ownership
Licensor retains all rights, title, and interest in Pro Features, including:
- Source code
- Trade secrets
- Patents (if applicable)
- Trademarks

### 9.2 Licensee Ownership
Licensee retains ownership of:
- Applications built using Pro Features
- Modifications made for internal use
- Generated code/schemas (not the generator itself)

## 10. Support & Updates

### 10.1 Updates
Licensee receives all updates and bug fixes for Pro Features during the active license period.

### 10.2 Breaking Changes
Major version updates (e.g., v2.0 → v3.0) may require license upgrade or renewal.

### 10.3 Support Levels
- **Starter:** Best-effort email responses (1 seat)
- **Professional:** Prioritized responses via GitHub discussions/issues
- **Business:** Priority support with early access previews
- **Enterprise:** Dedicated support with quarterly roadmap reviews and co-planning

## 11. Warranty & Disclaimer

### 11.1 Limited Warranty
Licensor warrants that Pro Features will substantially conform to documentation for 90 days from purchase.

### 11.2 Disclaimer
EXCEPT AS EXPRESSLY PROVIDED, PRO FEATURES ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

## 12. Limitation of Liability

IN NO EVENT SHALL LICENSOR BE LIABLE FOR:
- Indirect, incidental, special, or consequential damages
- Loss of profits, data, or business interruption
- Damages exceeding fees paid in the 12 months prior to claim

## 13. Term & Termination

### 13.1 Term
License begins on purchase date and continues for one year (annual subscription).

### 13.2 Termination for Breach
Licensor may terminate immediately if Licensee:
- Violates reverse engineering restrictions
- Exceeds licensed Developer Seats
- Shares License Keys
- Fails to pay within 30 days of due date

### 13.3 Effect of Termination
Upon termination, Licensee must:
- Cease using Pro Features
- Remove Pro Features from production
- Destroy all copies of obfuscated code

**Core Features (MIT Licensed) remain usable after termination.**

## 14. Confidentiality

Pro Features include **trade secrets** and **proprietary information**. Licensee agrees to:
- Maintain confidentiality of Pro Features
- Not disclose implementation details to third parties
- Take reasonable measures to prevent unauthorized access

## 15. Export Compliance

Licensee agrees to comply with all applicable export control laws and regulations.

## 16. Governing Law

This Agreement is governed by the laws of **the State of California, United States**, without regard to conflict of law principles.

## 17. Dispute Resolution

### 17.1 Negotiation
Parties agree to first attempt good-faith negotiation for 30 days.

### 17.2 Arbitration
If negotiation fails, disputes will be resolved through binding arbitration.

## 18. Entire Agreement

This Agreement constitutes the entire agreement between parties and supersedes all prior agreements.

## 19. Amendments

Licensor may update this Agreement with 30 days notice. Continued use after notice period constitutes acceptance.

## 20. Severability

If any provision is found invalid, the remaining provisions remain in effect.

## 21. Contact Information

**Licensor:** Omar Dulaimi
**Contact:** DM [@omardulaimidev on X](https://x.com/omardulaimidev)
**Website:** https://omar-dulaimi.github.io/prisma-zod-generator/pricing
**Support:** https://github.com/omar-dulaimi/prisma-zod-generator/issues

---

## Acceptance

By purchasing a PZG Pro license, using Pro Features, or entering a License Key, you acknowledge that you have read, understood, and agree to be bound by this Agreement.

**Last Updated:** January 2025
**Version:** 1.0

---

**Questions about licensing?** Reach out via [@omardulaimidev on X](https://x.com/omardulaimidev)
