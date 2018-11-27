#!/usr/bin/env python3
"""
Tests the wait_seconds function
"""

from time import time
from proteus.test_scenario import TestScenario, TestEvent


def test_scenario(config, channel):
    """ Tests basic waiting """
    wait_test = TestScenario(
        "WaitTest",
        config,
        channel)
    start = None
    wait_test.wait_seconds(20)

    def _time_check():
        """ Perform a time check """
        if time() - start >= 20:
            return True
        return False

    wait_test.events.append(
        TestEvent(
            _time_check,
            "Failed to wait"))
    start = time()
    return wait_test
