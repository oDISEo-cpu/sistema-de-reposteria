// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app';

export default defineConfig((/* ctx */) => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: ['app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      'roboto-font',
      'material-icons',
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {},

      typescript: {
        strict: true,
        vueShim: true,
      },

      filenameBasedRouting: true,

      vueRouterMode: 'hash',

      vitePlugins: [
        [
          'vite-plugin-checker',
          {
            vueTsc: true,
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      open: true,
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {},

      // Quasar plugins
      plugins: [
        'Notify'
      ],
    },

    animations: [],

    ssr: {
      prodPort: 3000,
      middlewares: [
        'render',
      ],
    },

    ssg: {},

    pwa: {
      workboxMode: 'GenerateSW',
    },

    cordova: {},

    capacitor: {
      hideSplashscreen: true,
    },

    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'packager',
      packager: {},
      builder: {
        appId: 'frontend',
      },
    },

    bex: {
      extraScripts: [],
    },
  };
});