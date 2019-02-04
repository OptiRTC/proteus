const path = require('path');


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
    node: {
        fs: "empty"
    },
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
