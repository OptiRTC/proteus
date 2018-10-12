#!/usr/bin/env python3

"""
Facilitates running tests and flashing the device
"""

import re
from subprocess import PIPE, Popen
from time import sleep, time
from junit_xml import TestCase, TestSuite

from proteus.flasher import BaseFlasher
from proteus.communication import NewlineChannel


class TestInstance():
    """ Runs exactly one test binary"""
    ASSERTION_RE = re.compile(r"^Assertion\s(.+)\:\s(.+)")
    TEST_RE = re.compile(r"^Test\s([a-zA-Z0-9_]+)\s([a-z]+)\.")
    SUMMARY_RE = re.compile(
        r"^Test\ssummary\:\s([0-9]+)\spassed,"
        r"\s([0-9]+)\sfailed,\sand\s([0-9]+)\s"
        r"skipped,\sout\sof\s([0-9]+)\stest\(s\)\.")

    def __init__(self, suite_id, binfile, expected_tests):
        self.start = 0
        self.suite_info = (binfile, suite_id)
        self.finished = False
        self.expected_tests = expected_tests
        self.tests = []
        self.assertions = []
        self.last_test = 0

    def name(self):
        """ Builds formatted name string """
        return "{}_test{}".format(self.suite_info[0], self.suite_info[1])

    def start_test(self):
        """ Starts test at now """
        self.start = time()
        self.last_test = self.start

    def parse_line(self, timestamp, line):
        """ Read a logfile and parse """
        result = self.ASSERTION_RE.match(line)
        if result and result.group(1) and result.group(2):
            print(line)
            self.assertions.append(line)
            return
        result = self.TEST_RE.match(line)
        if result and result.group(1) and result.group(2):
            test_name = result.group(1)
            test_status = result.group(2)
            print("{}: {}".format(
                test_status,
                test_name))
            test_case = TestCase(
                name=test_name,
                classname=self.name(),
                elapsed_sec=timestamp - self.last_test,  # Duration
                stdout=self.assertions,
                stderr=None,
                assertions=len(self.assertions),
                timestamp=timestamp,
                status=test_status)
            if test_status == "failed":
                test_case.add_failure_info(
                    message="Test Failed",
                    output="\n".join(self.assertions),
                    failure_type="assert")
            self.tests.append(test_case)
            self.assertions = []
            self.last_test = timestamp
            return
        result = self.SUMMARY_RE.match(line)
        if result:
            total = max(self.expected_tests, int(result.group(4)))
            if total != len(self.tests):
                print("ERROR: Dropped {} tests".format(total - len(self.tests)))
                dropped = total - len(self.tests)
                while dropped > 0:
                    self.tests.append(TestCase(
                        name="Unknown dropped test",
                        classname=self.name(),
                        elapsed_sec=0,
                        stderr="ERROR: Test missing",
                        timestamp=time(),
                        status="skipped"))
                    dropped -= 1
            self.finished = True

    def finish(self):
        """ Closes a test suite """
        self.finished = True
        return TestSuite(
            self.name(),
            self.tests,
            None,
            self.suite_info[1],
            None,
            time())


class TestRunner():
    """
    Flash and collect serial data from a test bin
    """
    SERIAL_WAIT_SEC = 6
    SERIAL_TIMEOUT = 10
    MAX_RETRIES = 3
    # Based on output from spark-unit-test framework

    def __init__(self, config):
        self.config = config
        self.channel = NewlineChannel.factory(config)
        self.test_suites = []
        self.suite_id = 0
        self.platform = config.get('Host', 'platform')
        self.retries = 0

    def comm_setup(self):
        """ Wait for port to exist and be openable """
        sleep(self.SERIAL_WAIT_SEC)
        while not self.channel.open():
            sleep(self.SERIAL_WAIT_SEC)

    def run_test_suite(self, binfile, expected_tests):
        """ Run a test suite with retries """
        test = TestInstance(self.suite_id, binfile, expected_tests)
        flasher = BaseFlasher.factory(binfile, self.config)
        flasher.flash()
        self.comm_setup()
        while self.channel.alive() or not self.channel.input.empty():
            if self.channel.input.empty():
                continue
            line = self.channel.input.get()
            self.channel.input.task_done()
            test.parse_line(time(), line)
            if line == "Ready":
                # Write a ascii t to start the tests
                self.channel.output.put("t\r\n".encode())
                test.start_test()
            if line == "Starting in DFU mode" or test.finished:
                # This message happens on reboot/test end
                break
        self.channel.close()
        self.test_suites.append(test.finish())
        self.suite_id += 1
        self.retries = 0

    def run_test_scenario(self, scenario, binfile):
        """ Run a test scenario with retries """
        test = TestInstance(self.suite_id, binfile, 1)
        test.start_test()
        with Popen([scenario + '.py'], stdout=PIPE) as process:
            for line in iter(process.stdout.readline, b''):
                if line:
                    test.parse_line(time(), line.decode('utf-8'))
        self.test_suites.append(test.finish())
        self.suite_id += 1
        self.retries = 0

    def get_xml(self):
        """ Render XML """
        return TestSuite.to_xml_string(self.test_suites)
