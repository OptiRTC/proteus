#!/usr/bin/env python3
"""
Fails a test scenario
"""

from configparser import ConfigParser
from proteus.test_scenario import TestScenario

CONFIG = ConfigParser()
CONFIG.read('tests/test_config')

PASS_TEST = TestScenario(
    "PassTest", CONFIG)
PASS_TEST.wait_seconds(2).expect(
    True,
    "Expected Failure")
PASS_TEST.run()
