// @ts-check
const { getLocalIdent } = require('astroturf/getLocalIdent');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'react-data-editor',
  tagline: 'Schema based data visualizer and editor',
  url: 'https://jquense.github.io.',
  baseUrl: '/data-editor/',

  organizationName: 'jquense',
  projectName: 'react-data-editor',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: ['docusaurus-theme-jarle-codeblock'],
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          remarkPlugins: [require('docusaurus-theme-jarle-codeblock/remark')],
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],
  plugins: [
    ['docusaurus-plugin-astroturf', { useAltLoader: false }],
    () => ({
      name: 'resolve-react',
      configureWebpack(config, isServer, utils) {
        let runtimes;
        try {
          runtimes = {
            'react/jsx-runtime': require.resolve('react/jsx-runtime'),
            'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
          };
        } catch (e) {
          runtimes = {};
        }

        // for (const rule of config.module.rules) {
        //   if (!rule || !rule.use) continue;

        //   [].concat(rule.use).forEach((loaders) => {
        //     if (
        //       loaders.loader.includes('css-loader') &&
        //       loaders.options.modules
        //     ) {
        //       loaders.options.modules.localIdentName =
        //         '[path][name]__[local]--[hash:base64:5]';

        //       // loaders.options.modules.getLocalIdent = getLocalIdent;
        //       console.log('here', loaders.loader);
        //     }
        //   });
        // }

        return {
          devtool: 'inline-source-map',

          resolve: {
            alias: {
              '@lib': require.resolve('../src/index.tsx'),
              react$: require.resolve('react'),
              ...runtimes,
              'react-dom$': require.resolve('react-dom'),
              'react-dom/server': require.resolve('react-dom/server'),
            },
          },
        };
      },
    }),
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        disableSwitch: true,
      },
      navbar: {
        title: 'schema-editor',
        logo: {
          alt: 'Jarle Logo',
          src: 'img/logo.svg',
          srcDark: 'img/logo_dark.svg',
        },
        items: [
          {
            href: 'https://github.com/jquense/react-data-editor',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [],
        copyright: `Copyright © ${new Date().getFullYear()} Jason Quense. Built with Docusaurus.`,
      },
    }),
};

module.exports = config;
