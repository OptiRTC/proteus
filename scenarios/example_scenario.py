#!/usr/bin/env python3

from test_scenario import TestScenario

POWER_CYCLES = TestScenario(
    "ManualOperationModeAcrossPowerCycles")
POWER_CYCLES.wait_message("Power Up!").expect(
    True,
    "Device didn't initially power up")
POWER_CYCLES.wait_message("Power Up!").expect(
    True,
    "Device didn't power on after reset")

POWER_CYCLES.run()
