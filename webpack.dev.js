const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(common, {
    mode: 'development',
    plugins: [
        new HtmlWebpackPlugin({
            title: 'ReglInlineTypescriptTemplate',
            minify: {
                collapseWhitespace: false
            }
        }),
    ],
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './docs',
    },
});
