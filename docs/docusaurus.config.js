/* eslint-disable global-require,import/no-commonjs */
// @ts-check
const typedocConfig = require('./typedoc')

/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'Laika',
  tagline: require('../package.json').description,
  url: 'https://zendesk.github.io',
  baseUrl: '/laika/',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  favicon: 'img/favicon.ico',
  organizationName: 'zendesk', // Usually your GitHub org/user name.
  projectName: 'laika', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'Laika',
      logo: {
        alt: 'Home',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: 'docs/',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          href: 'https://github.com/zendesk/laika',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [],
      copyright: `Copyright © ${new Date().getFullYear()} Zendesk Inc. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/zendesk/laika/edit/master/docs-meta/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        ...typedocConfig,
        out: 'docs/api',
        watch: process.env.TYPEDOC_WATCH,
      },
    ],
  ],
}
