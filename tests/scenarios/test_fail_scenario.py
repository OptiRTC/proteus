#!/usr/bin/env python3
"""
Fails a test scenario
"""

from proteus.test_scenario import TestScenario


def test_scenario(config, channel):
    """ Should always fail"""
    failure_test = TestScenario(
        "FailTest",
        config,
        channel)
    failure_test.ENABLE_DEBUG = True
    failure_test.wait_seconds(2).expect(
        False,
        "Expected Failure")
    return failure_test
