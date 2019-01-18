let scenario = require('./spark-unit-scenario').scenario;

// Build promise chain
scenario.run({binary: 'unit-test.bin'})
.then(results => console.log(JSON.stringify(results)))
.catch(e => { throw e; })
.finally(() => process.exit(0));
