#!/usr/bin/env python3
""" An example test scenario definition """

from test_scenario import TestScenario

# Entry point must be named test scenario
def test_scenario(config, channel):
    """ Defines and returns a test scenario"""
    power_cycles = TestScenario(
        "ManualOperationModeAcrossPowerCycles",
        config,
        channel)
    power_cycles.wait_message("Power Up!").expect(
        True,
        "Device didn't initially power up")
    power_cycles.wait_message("Power Up!").expect(
        True,
        "Device didn't power on after reset")
    return power_cycles
