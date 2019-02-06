let BaseScenario = require('./base-scenario');

class TestScen extends BaseScenario
{
    constructor()
    {
        this.messages = [
            "Fail! Starting",
            "{propertyname: 0}"
        ];
    }

    setPower(onoff) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    getMessage(msg) {
        return new Promise((resolve, reject) => {
            let new_msg = this.messages.shift();
            if (msg == new_msg)
            {
                resolve();
            } else {
                reject("ERROR");
            }
        });
    }

    getState(object) {
        return new Promise((resolve, reject) => {
            let str = this.messages.shift();
            let test = JSON.parse(str);
            if (test === object)
            {
                resolve();
            } else {
                reject("ERROR 2");
            }
        })
    }
}

const defaultTest = new TestScen();

// Build promise chain
defaultTest.first().then(() =>
defaultTest.setPower(true)).then(() =>
defaultTest.getMessage("Test Starting")).then(() =>
defaultTest.getState({ propertyname: 0})).then(() =>
defaultTest.pass());

exports.default = defaultTest;
