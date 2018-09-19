#!/usr/bin/env python3
"""
Fails a test scenario
"""

from proteus.test_scenario import TestScenario
from configparser import ConfigParser
config = ConfigParser()
config.read('tests/test_config')

FAILURE_TEST = TestScenario(
    "FailTest", config)
FAILURE_TEST.wait_seconds(2).expect(
    False,
    "Expected Failure")
FAILURE_TEST.run()
