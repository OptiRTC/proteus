#!/usr/bin/env python3
"""
Fails a test scenario
"""

from configparser import ConfigParser
from proteus.test_scenario import TestScenario

CONFIG = ConfigParser()
CONFIG.read('tests/test_config')

FAILURE_TEST = TestScenario(
    "FailTest", CONFIG)
FAILURE_TEST.wait_seconds(2).expect(
    False,
    "Expected Failure")
FAILURE_TEST.run()
