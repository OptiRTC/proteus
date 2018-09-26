#!/usr/bin/env python3

""" Checks that PEP8 Passes """

import unittest

import pep8


class CodeStyleTest(unittest.TestCase):
    """ Defines PEP8 tests """
    FILES = [
        "test_manager.py",
        "test_runner.py",
        "test_scenario.py",
        "flasher.py",
        "communication.py",
        "tests/test_channels.py",
        "tests/test_code_style.py",
        "tests/test_manager_test.py",
        "tests/test_runner_test.py",
        "tests/test_scenario_test.py",
        "tests/scenarios/test_fail_scenario.py",
        "tests/scenarios/test_pass_scenario.py",
        "tests/scenarios/test_wait_message_scenario.py",
        "tests/scenarios/test_wait_seconds_scenario.py",
        "appveyor/appveyor_manager.py",
        "appveyor/appveyor_test_wait.py"
    ]

    def test_code_style(self):
        """ Runs PEP8 check against static set of files """
        style = pep8.StyleGuide()
        style.options.max_line_length = 100
        check = style.check_files(self.FILES)
        self.assertEqual(check.total_errors, 0, 'PEP8 style errors: %d' % check.total_errors)

if __name__ == '__main__':
    unittest.main()
