#!/usr/bin/env python3

"""
Runs tests with default values
"""

from test_manager import TestManager

TESTS = TestManager()
TESTS.add_test("unit_tests_1")
TESTS.add_test("integration_test")
TESTS.add_test("smoke_test")
TESTS.add_test("unit_tests_3")

#TESTER.enable_destructive_tests(True)
TESTS.add_destructive_test("NAND_Write_test")
TESTS.add_destructive_test("stress_test")
    
TESTS.add_scenario("unexpected_powercycle")
TESTS.add_scenario("disconnect_wifi")

TESTS.run_tests("results.xml")
