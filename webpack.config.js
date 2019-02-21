const path = require('path');
const webpack = require('webpack');

module.exports = {
    target: 'node',
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: 'shebang-loader'
            }
        ]
    },
    node: false,
    mode: 'development',
    optimization: {
        providedExports: true,
        usedExports: true,
        minimize: false
    },
    resolve: {
        modules: [
            'node_modules',
            'common/node_modules',
            'core/node_modules',
            'worker/node_modules'
        ],
        alias: {
            common: path.resolve(__dirname,'bin/common/src'),
            core: path.resolve(__dirname, 'bin/core/src'),
            worker: path.resolve(__dirname, 'bin/worker/src')
        },
        extensions: ['.js']
    }
};
