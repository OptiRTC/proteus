const path = require('path');
var config = require('./webpack.config');
config.entry = './bin/core/src/execute.js';
config.output = {
    filename: 'core.js',
    path: path.resolve(__dirname, 'dist/core/')
};

module.exports = config;
