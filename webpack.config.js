const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV || 'development',

  entry: {
    // Content Scripts
    'content/toolbar': './content/toolbar.ts',
    'content/activation-modal': './content/activation-modal.ts',
    'content/highlighter': './content/highlighter.ts',
    'content/floating-translator': './content/floating-translator.ts',
    'content/google-docs-adapter': './content/google-docs-adapter.ts',
    'content/onboarding': './content/onboarding.ts',

    // Background Service Worker
    background: './background.ts',

    // Popup
    'popup/popup': './popup/popup.ts',

    // Options Page
    'options/options': './options/options.ts',
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'content/'),
      '@config': path.resolve(__dirname, 'config/'),
    },
  },

  module: {
    rules: [
      // TypeScript Loader
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                module: 'esnext',
              },
            },
          },
        ],
        exclude: /node_modules/,
      },

      // Babel Loader for JavaScript
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: '120',
                },
                modules: 'auto',
              }],
            ],
            sourceMap: true,
          },
        },
        exclude: /node_modules/,
      },

      // CSS Loader (if needed in future)
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },

  devtool: process.env.NODE_ENV === 'production'
    ? 'source-map'
    : 'eval-source-map',

  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    usedExports: true,
  },

  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
  },

  stats: {
    colors: true,
    modules: false,
    children: false,
  },
};
