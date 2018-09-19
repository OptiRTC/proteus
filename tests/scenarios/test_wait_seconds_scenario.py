#!/usr/bin/env python3
"""
Fails a test scenario
"""

from configparser import ConfigParser
from time import time
from proteus.test_scenario import TestScenario, TestEvent

config = ConfigParser()
config.read('tests/test_config')

WAIT_TEST = TestScenario(
    "WaitTest", config)
START = None
WAIT_TEST.wait_seconds(20)
def _time_check():
    if time() - START >= 20:
        return True
    return False

WAIT_TEST.events.append(
    TestEvent(
        _time_check,
        "Failed to wait"))
START = time()
WAIT_TEST.run()
