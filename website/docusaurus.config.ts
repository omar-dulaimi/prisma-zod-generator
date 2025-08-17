import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Prisma Zod Generator',
  tagline:
    'Typed, configurable Zod schemas from your Prisma schema: variants, pure models, minimal mode, and more.',
  favicon: 'img/favicon.ico',
  url: 'https://omar-dulaimi.github.io',
  baseUrl: '/prisma-zod-generator/',
  organizationName: 'omar-dulaimi',
  projectName: 'prisma-zod-generator',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0',
      },
    },
  ],
  themes: [],
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.ts'),
          editUrl: 'https://github.com/omar-dulaimi/prisma-zod-generator/tree/master/website/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: false,
          path: 'docs',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        sitemap: { changefreq: 'weekly', priority: 0.5 },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      require.resolve('docusaurus-plugin-search-local'),
      {
        highlightSearchTermsOnTargetPage: true,
        hashed: true,
        indexDocs: true,
        indexBlog: false,
      },
    ],
  ],
  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Prisma Zod Generator',
      items: [
        { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs' },
        { to: '/docs/next/changelog', label: 'Changelog', position: 'left' },
        { type: 'html', position: 'right', value: '<div class="navbar-theme-toggle"></div>' },
        {
          href: 'https://github.com/omar-dulaimi/prisma-zod-generator',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Omar Dulaimi. Built with Docusaurus.`,
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
  } satisfies Preset.ThemeConfig,
};
export default config;
