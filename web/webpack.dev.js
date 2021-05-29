const { merge } = require('webpack-merge');
const common = require('./webpack.common');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const manifest = require('./src/manifest.json');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
  plugins: [new WebpackPwaManifest(manifest)],
  devServer: {
    contentBase: './dist',
    hot: true,
    host: '0.0.0.0',
  },
});
