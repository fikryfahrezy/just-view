const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './src',
        hot: true,
        host: '0.0.0.0',
    },
    entry: './src/index.js',
    module: {
        rules: [
            {
                test: /\.html$/i,
                loader: 'html-loader',
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html',
        }),
    ],
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
