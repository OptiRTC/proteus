#!/usr/bin/env python3
""" Scenario function tests """
import os
import unittest
from pty import openpty

from proteus.test_scenario import TestEvent, TestScenario
from proteus.test_manager import TestManager

class TestEventTest(unittest.TestCase):
    """ Tests TestEvent """

    def test_expect(self):
        """ Ensures a test event is evaluated """
        fixture = TestEvent(lambda: True)
        self.assertTrue(fixture.run())
        fixture.expect(False, "Not False")
        self.assertFalse(fixture.run())
        self.assertEqual(fixture.error(), "Assertion: Not False")

class TestScenarioTest(unittest.TestCase):
    """ Tests a basic scenario """

    def test_scenarios(self):
        """ Runs end-to-end integration on scenarios with known state """
        fixture = TestManager('tests/test_config')       
        fixture.add_scenario("test_pass_scenario")
        fixture.add_scenario("test_fail_scenario")
        fixture.add_scenario("test_wait_message_scenario")
        fixture.add_scenario("test_wait_seconds_scenario")
        fixture.run()
        self.assertEqual(len(fixture.test_agent.test_suites), 4)
        self.assertEqual(fixture.test_agent.test_suites[0].test_cases[0].status, 'passed')
        self.assertEqual(fixture.test_agent.test_suites[1].test_cases[0].status, 'failed')
        self.assertEqual(fixture.test_agent.test_suites[2].test_cases[0].status, 'passed')
        self.assertEqual(fixture.test_agent.test_suites[3].test_cases[0].status, 'passed')

if __name__ == '__main__':
    unittest.main()
