#!/usr/bin/env python3
"""
Fails a test scenario
"""

from proteus.test_scenario import TestScenario
from configparser import ConfigParser
config = ConfigParser()
config.read('tests/test_config')

PASS_TEST = TestScenario(
    "PassTest",config)
PASS_TEST.wait_seconds(2).expect(
    True,
    "Expected Failure")
PASS_TEST.run()
