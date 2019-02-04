const path = require('path');
var config = require('./webpack.config');
config.entry = './bin/worker/src/execute.js';
config.output = {
    filename: 'worker.js',
    path: path.resolve(__dirname, 'dist/worker/')
};

module.exports = config;
