#!/usr/bin/env python3
""" Tests the test manager """
import unittest

from proteus.test_manager import TestManager


class TestManagerTest(unittest.TestCase):
    """ Tests TestInstance for basic function """

    def test_default_config(self):
        """ Tests default config """
        fixture = TestManager()
        self.assertEqual(fixture.config.get('CI', 'ci_platform'), 'APPVEYOR')
        self.assertEqual(fixture.config.get('Scenarios', 'user_app'), 'user.bin')

    def test_dummy_config_read(self):
        """ Tests reading from config file"""
        fixture = TestManager('tests/test_config')
        self.assertEqual(fixture.config.get('CI', 'ci_platform'), 'DUMMY')
        self.assertEqual(fixture.config.get('Scenarios', 'user_app'), 'DUMMY')

    def test_add_test(self):
        """ Tests adding a test to the queue """
        fixture = TestManager('tests/test_config')
        fixture.add_test('bin')
        fixture.add_test('bin2')
        self.assertEqual(len(fixture.tests), 2)

    def test_add_scenario(self):
        """ Tests adding a scenario to the queue """
        fixture = TestManager('tests/test_config')
        fixture.add_scenario('bin')
        fixture.add_scenario('bin2')
        self.assertEqual(len(fixture.scenarios), 2)

    def test_destructive_tests(self):
        """ Tests adding and enabling destructive tests """
        fixture = TestManager('tests/test_config')
        fixture.add_destructive_test('nand')
        self.assertEqual(len(fixture.tests), 0)
        fixture.enable_destructive_tests(True)
        self.assertEqual(len(fixture.tests), 0)
        fixture.add_destructive_test('nand2')
        self.assertEqual(len(fixture.tests), 1)

    def test_destructive_scenarios(self):
        """ Tests adding and enabling destructive scenarios """
        fixture = TestManager('tests/test_config')
        fixture.add_destructive_scenario('nand')
        self.assertEqual(len(fixture.scenarios), 0)
        fixture.enable_destructive_tests(True)
        self.assertEqual(len(fixture.scenarios), 0)
        fixture.add_destructive_scenario('nand2')
        self.assertEqual(len(fixture.scenarios), 1)

    def test_expectations(self):
        """ Tests expectation setting """
        fixture = TestManager('tests/test_config')
        fixture.add_test('bin')
        fixture.expect_tests('bin', 20)
        self.assertEqual(fixture.expectations['bin'], 20)


if __name__ == '__main__':
    unittest.main()
