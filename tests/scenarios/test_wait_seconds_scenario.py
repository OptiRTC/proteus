#!/usr/bin/env python3
"""
Fails a test scenario
"""

from configparser import ConfigParser
from time import time
from proteus.test_scenario import TestScenario, TestEvent

CONFIG = ConfigParser()
CONFIG.read('tests/test_config')

WAIT_TEST = TestScenario(
    "WaitTest", CONFIG)
START = None
WAIT_TEST.wait_seconds(20)


def _time_check():
    """ Perform a time check """
    if time() - START >= 20:
        return True
    return False

WAIT_TEST.events.append(
    TestEvent(
        _time_check,
        "Failed to wait"))
START = time()
WAIT_TEST.run()
