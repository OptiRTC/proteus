#!/usr/bin/env python3
"""
Tests the wait_message function
"""

from proteus.test_scenario import TestScenario, TestEvent


def test_scenario(config, channel):
    """ Tests injecting a message """
    msg_test = TestScenario(
        "MsgTest",
        config,
        channel)

    def _inject_message():
        """ Test function to inject a message """
        msg_test.channel.input.put("Pass")
        return True

    msg_test.events.append(
        TestEvent(
            _inject_message,
            "Failed to inject"))
    msg_test.wait_message("Pass").expect(
        True,
        "Did not get message")
    return msg_test
