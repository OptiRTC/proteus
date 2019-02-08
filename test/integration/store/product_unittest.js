const BaseScenario = require('./base-scenario.js').BaseScenario;
    
scenario = new BaseScenario();

scenario.first().then(() => 
scenario.passTest("BasicTest01")).then(() =>
scenario.passTest("BasicTest02")).then(() => 
scenario.passTest("ProductAssertsTrue")).then(() =>
scenario.passTest("ProductParser")).then(() =>
scenario.end());

exports.scenario = scenario;
