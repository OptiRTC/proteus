#!/usr/bin/env python3

"""
Runs a test sequence and provides and API to easily
specify tests and scenarios to run
"""
import sys
from time import time, sleep

from configparser import ConfigParser
from proteus.test_runner import TestRunner
from proteus.flasher import BaseFlasher


class TestManager():
    """ Runs tests on device """

    DEFAULT_CONFIGFILE = 'init/config.default'

    def __init__(self,
                 configfile=None):

        self.config = ConfigParser()
        if configfile is None:
            configfile = self.DEFAULT_CONFIGFILE
        self.config.read(configfile)

        self.test_agent = TestRunner(self.config)
        # Runs test using the unit testing framework
        self.tests = []
        self.expectations = {}
        if 'Tests' in self.config.sections():
            for binfile in self.config['Tests']:
                self.expect_tests(binfile, int(self.config['Tests'][binfile]))
        self.destructive_tests = False
        self.scenarios = []
        self.result_filename = ""

    def add_test(self, test_bin):
        """ Adds a test binary to be run """
        self.tests.append(test_bin)

    def expect_tests(self, test_bin, count):
        """ Set the number of expected tests """
        self.expectations[test_bin] = count

    def add_scenario(self, scenario_name):
        """ Adds a scenario (python script) to be run """
        self.scenarios.append(scenario_name)

    def add_destructive_test(self, test_bin):
        """ Adds test only if destructive tests have been enabled """
        if self.destructive_tests:
            self.tests.append(test_bin)

    def add_destructive_scenario(self, scenario_name):
        """ Adds scenario only if destructive tests have been enabled """
        if self.destructive_tests:
            self.scenarios.append(scenario_name)

    def enable_destructive_tests(self, enable):
        """ Enables destructive testing """
        self.destructive_tests = enable

    def run_tests(self, result_filename):
        """ Executes tests and writes results to file """
        self.result_filename = result_filename
        bin_path = self.config.get('Host', 'bin_path')
        scenario_path = self.config.get('Scenarios', 'scenario_path')
        scenario_bin = self.config.get('Scenarios', 'user_app')
        for test in self.tests:
            print("================ {} ================".format(test))
            count = self.expectations.get(test, 0)
            self.test_agent.run_test_suite(bin_path + test + ".bin", count)
        binfile = self.config.get('Scenarios', 'user_app')
        flasher = BaseFlasher.factory(binfile, self.config)
        flasher.flash()
        for scenario in self.scenarios:
            print("================ {} ================".format(scenario))
            self.test_agent.run_test_scenario(
                "{}/{}".format(scenario_path,
                               scenario),
                bin_path + scenario_bin)

        xml = self.test_agent.get_xml()

        with open(self.result_filename, "w") as file:
            file.write(xml)

    def run(self):
        """ Runs tests and writes to default file """
        try:
            self.run_tests("{}_{}.xml".format(
                self.config.get('Host', 'result_prefix'),
                time()))
        except:  # pylint: disable=W0702
            sleep(30)
            sys.exit(1)

    def get_xml(self):
        """ Returns XML """
        return self.test_agent.get_xml()
