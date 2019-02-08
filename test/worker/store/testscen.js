const BaseScenario = require('./base-scenario.js').BaseScenario;

let scenario = new BaseScenario();

scenario.name = "TestScen";

scenario.first().then(() => 
scenario.passTest("PassTest")).then(() =>
scenario.end());

exports.scenario = scenario;
