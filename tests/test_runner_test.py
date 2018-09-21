#!/usr/bin/env python3
""" Tests the test runner """
import os
import unittest
from time import time, sleep

from configparser import ConfigParser
from pty import openpty
from threading import Thread

from proteus.test_runner import TestInstance, TestRunner


class TestInstanceTest(unittest.TestCase):
    """ Tests TestInstance for basic function """

    def test_name(self):
        """ Tests name rendering """
        fixture = TestInstance(0, "app", 1)
        self.assertEqual(fixture.name(), "app_test0")

    def test_start_test(self):
        """ Tests start """
        fixture = TestInstance(0, "app", 1)
        self.assertEqual(fixture.start, 0)
        fixture.start_test()
        self.assertTrue(fixture.start > 0)
        self.assertEqual(fixture.start, fixture.last_test)

    def test_parse_line(self):
        """ Tests the line parser """
        fixture = TestInstance(0, "app", 3)
        dropped_line = "This line should be dropped."
        assert_line = "Assertion app.txt: asserted."
        failure_line = "Test FailureTest failed."
        success_line = "Test PassTest passed."
        skip_line = "Test SkipTest skipped."
        summary_line = "Test summary: 1 passed, 1 failed, and 1 skipped, out of 3 test(s)."
        fixture.start_test()
        fixture.parse_line(time(), dropped_line)
        fixture.parse_line(time(), assert_line)
        fixture.parse_line(time(), failure_line)
        fixture.parse_line(time(), success_line)
        fixture.parse_line(time(), skip_line)
        fixture.parse_line(time(), summary_line)
        self.assertEqual(len(fixture.tests), 3)
        self.assertTrue(fixture.finished)
        self.assertEqual(fixture.tests[0].assertions, 1)
        self.assertEqual(fixture.tests[0].classname, "app_test0")
        self.assertEqual(fixture.tests[0].name, "FailureTest")
        self.assertEqual(fixture.tests[0].status, "failed")
        self.assertEqual(fixture.tests[1].name, "PassTest")
        self.assertEqual(fixture.tests[1].status, "passed")
        self.assertEqual(fixture.tests[2].name, "SkipTest")
        self.assertEqual(fixture.tests[2].status, "skipped")

    def test_finish(self):
        """ Tests finish """
        fixture = TestInstance(0, "app", 1)
        test_line = "Test PassTest passed."
        summary_line = "Test summary: 1 passed, 0 failed, and 0 skipped, out of 1 test(s)."
        fixture.start_test()
        fixture.parse_line(time(), test_line)
        fixture.parse_line(time(), summary_line)
        suite = fixture.finish()
        self.assertEqual(suite.name, "app_test0")

    def test_dropped_tests(self):
        """ Tests dropped test behavior """
        fixture = TestInstance(0, "app", 0)
        summary_line = "Test summary: 4 passed, 0 failed, and 0 skipped, out of 4 test(s)."
        fixture.start_test()
        fixture.parse_line(time(), summary_line)
        suite = fixture.finish()
        self.assertEqual(len(fixture.tests), 4)
        self.assertEqual(fixture.tests[0].status, "skipped")
        self.assertEqual(fixture.tests[0].name, "Unknown dropped test")
        self.assertTrue(suite is not None)

    def test_expectation_used(self):
        """ Tests that expectations don't override test report """
        fixture = TestInstance(0, "app", 8)
        fixture.start_test()
        fixture.parse_line(time(), "Test Pass1 passed.")
        fixture.parse_line(time(), "Test Pass2 passed.")
        fixture.parse_line(time(), "Test Pass3 passed.")
        fixture.parse_line(time(), "Test Pass4 passed.")
        fixture.parse_line(
            time(),
            "Test summary: 4 passed, 0 failed, and 0 skipped, out of 4 test(s).")
        suite = fixture.finish()
        self.assertEqual(len(fixture.tests), 8)
        self.assertEqual(fixture.tests[0].status, "passed")
        self.assertEqual(fixture.tests[0].name, "Pass1")
        self.assertEqual(fixture.tests[3].status, "passed")
        self.assertEqual(fixture.tests[3].name, "Pass4")
        self.assertEqual(fixture.tests[4].status, "skipped")
        self.assertEqual(fixture.tests[4].name, "Unknown dropped test")
        self.assertEqual(fixture.tests[7].status, "skipped")
        self.assertEqual(fixture.tests[7].name, "Unknown dropped test")
        self.assertTrue(suite is not None)

    def test_dropped_finish(self):
        """ Tests that a missing finish doesn't invalidate tests """
        fixture = TestInstance(0, "app", 1)
        fixture.start_test()
        fixture.parse_line(time(), "Test Pass1 passed.")
        suite = fixture.finish()
        self.assertEqual(len(fixture.tests), 1)
        self.assertEqual(fixture.tests[0].status, "passed")
        self.assertEqual(fixture.tests[0].name, "Pass1")
        self.assertTrue(suite is not None)

if __name__ == '__main__':
    unittest.main()
