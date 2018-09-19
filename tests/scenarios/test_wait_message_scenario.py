#!/usr/bin/env python3
"""
Fails a test scenario
"""
from configparser import ConfigParser
from proteus.test_scenario import TestScenario, TestEvent

config = ConfigParser()
config.read('tests/test_config')

MSG_TEST = TestScenario(
    "MsgTest", config)
# Inject message directly into queue
def _inject_message():
    MSG_TEST.channel.input.put("Pass")
    return True

MSG_TEST.events.append(
    TestEvent(
        _inject_message,
        "Failed to inject"))
MSG_TEST.wait_message("Pass").expect(
    True,
    "Did not get message")
MSG_TEST.run()
