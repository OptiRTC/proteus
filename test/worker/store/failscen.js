const BaseScenario = require('./base-scenario.js').BaseScenario;

let scenario = new BaseScenario();

scenario.first().then(() => 
scenario.failTest("FailTest", ["Failed"])).then(() =>
scenario.end());

exports.scenario = scenario;