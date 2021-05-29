const { merge } = require('webpack-merge');
const common = require('./webpack.common');
const WorkboxPlugin = require('workbox-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const manifest = require('./src/manifest.json');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/offline.html',
      filename: 'offline.html',
      inject: false,
    }),
    new WebpackPwaManifest(manifest),
    new WorkboxPlugin.InjectManifest({
      swSrc: './src/sw',
    }),
  ],
});
