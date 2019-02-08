let BaseScenario = require('./base-scenario');

const defaultTest = new BaseScenario();
// Build promise chain
defaultTest.first().then(() =>
defaultTest.setPower(true)).then(() =>
defaultTest.getMessage("Test Starting")).then(() =>
defaultTest.getState({ propertyname: 0})).then(() =>
defaultTest.passTest("BasicTest")).then(() => 
defaultTest.end());

exports.default = defaultTest;
