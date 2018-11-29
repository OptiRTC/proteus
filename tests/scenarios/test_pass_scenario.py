#!/usr/bin/env python3
"""
Passes a test scenario
"""
from proteus.test_scenario import TestScenario


def test_scenario(config, channel):
    """ Should always pass"""
    pass_test = TestScenario(
        "PassTest",
        config,
        channel)
    pass_test.ENABLE_DEBUG = True
    pass_test.wait_seconds(2).expect(
        True,
        "Expected Failure")
    return pass_test
