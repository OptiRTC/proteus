#!/usr/bin/env python3

"""
Facilitates running tests and flashing the device
"""
from os import getenv, path
import re
from subprocess import call, Popen, PIPE
from time import sleep, time
from queue import Queue
import serial
from junit_xml import TestCase, TestSuite
from proteus.serial_thread import SerialThread, NewlineThread


class TestRunner():
    """
    Flash and collect serial data from a test bin
    """
    FLASH_WAIT_TIME = 6 # Experimentally determined on Ubuntu VM
    FLASH_BAUD = 14400 # Magic baud from Particle
    NEUTRAL_BAUD = 9600
    SERIAL_TIMEOUT = 10
    # Based on output from particle-unit-test framework
    ASSERTION_RE = re.compile(r"^Assertion\s(.+)\:\s(.+)")
    TEST_RE = re.compile(r"^Test\s([a-zA-Z0-9_]+)\s([a-z]+)\.")
    SUMMARY_RE = re.compile(
        r"^Test\ssummary\:\s([0-9]+)\spassed,"
        r"\s([0-9]+)\sfailed,\sand\s([0-9]+)\s"
        r"skipped,\sout\sof\s([0-9]+)\stest\(s\)\.")

    def __init__(self, port="/dev/ttyACM0", platform="electron"):
        self.port_name = port
        self.test_suites = []
        self.suite_id = 0
        self.suite_name = None
        self.platform = platform
        self.tests = []
        self.assertions = []
        self.max_retries = 3
        self.retries = 0
        self.last_test = 0
        self.start = 0
        self.test_finished = False

    def wait_for_serial(self):
        start = time()
        while not path.exists(self.port_name):
            sleep(1)
            if (time() - start) > self.FLASH_WAIT_TIME:
                break

    def set_flash_mode(self):
        """ Put particle device into DFU mode via magic baud """
        self.wait_for_serial()
        try:
            ser = serial.Serial(self.port_name, self.FLASH_BAUD)
            ser.close()
            ser = serial.Serial(self.port_name, self.NEUTRAL_BAUD)
            ser.close()
        except serial.SerialException:
            return

    def flash(self, binfile):
        """ Flashes firmware <binfile> to device """
        flash_cmd = "{} flash --usb {}".format(
            getenv(
                "PARTICLE_BIN",
                "/usr/bin/particle"),
            binfile)
        self.suite_name = binfile
        print("Flashing {}".format(binfile))
        self.set_flash_mode()
        sleep(self.FLASH_WAIT_TIME)
        while call(["/bin/sh", "-c", flash_cmd]) != 0:
            self.set_flash_mode()
            sleep(self.FLASH_WAIT_TIME)

    def serial_setup(self):
        """ Wait for port to exist and be openable """
        ser = None
        self.wait_for_serial()
        while ser is None:
            try:
                ser = serial.Serial(
                    self.port_name,
                    self.NEUTRAL_BAUD,
                    timeout=self.SERIAL_TIMEOUT)
                ser.close()
                break
            except serial.SerialException:
                ser = None
                sleep(self.FLASH_WAIT_TIME)
            except IOError:
                ser = None
                sleep(self.FLASH_WAIT_TIME)

    def scan_test(self):
        """ Scrape serial port to memory buffer """
        self.serial_setup()
        with serial.Serial(
                self.port_name,
                self.NEUTRAL_BAUD,
                timeout=60) as ser:

            byte_queue = Queue()
            line_queue = Queue()
            write_queue = Queue()
            reader = SerialThread(ser, byte_queue, write_queue)
            line_parser = NewlineThread(byte_queue, line_queue)
            reader.start()
            line_parser.start()
            ser.flushInput()
            ser.flushOutput()
            while ser.isOpen() or not line_queue.empty():
                if line_queue.empty():
                    continue
                line = line_queue.get()
                line_queue.task_done()
                self.parse_line(time(), line)
                if line == "Ready":
                    # Write a ascii t to start the tests
                    write_queue.put("t\r\n".encode())
                    self.start = time()
                    self.last_test = self.start
                    self.tests = []
                if line == "Starting in DFU mode" or not ser.isOpen():
                    # This message happens on reboot/test end
                    break
            reader.stop()
            reader.join()
            line_parser.stop()
            line_parser.join()
            ser.close()

    def run_test_suite(self, binfile):
        """ Run a test suite with retries """
        result = False
        while result is False:
            self.retries += 1
            if self.retries >= self.max_retries:
                break 
            self.flash(binfile)
            sleep(self.FLASH_WAIT_TIME)
            try:
                self.suite_name = "{}_test{}".format(binfile, self.suite_id)
                self.scan_test()
                result = True
            except serial.SerialException:
                pass
        self.suite_id += 1
        self.retries = 0

    def run_test_scenario(self, scenario, binfile):
        """ Run a test scenario with retries """
        self.tests = []
        result = False
        while result is False:
            self.retries += 1
            if self.retries >= self.max_retries:
                break
            self.flash(binfile)
            sleep(self.FLASH_WAIT_TIME)
        self.suite_name = "{}_{}_{}".format(binfile, scenario, self.suite_id)
        self.test_finished = False
        self.start = time()
        self.last_test = self.start
        process = Popen([scenario + '.py'], stdout=PIPE)
        for line in iter(process.stdout.readline, b''):
            if line:
                print(line)
                self.parse_line(time(), line.decode('utf-8'))
        self.finish_suite(len(self.tests))
        self.suite_id += 1
        self.retries = 0

    def finish_suite(self, total, timestamp=None):
        """ Closes a test suite """
        if self.test_finished:
            return
        if timestamp is None:
            timestamp = time()
        print("Processed {}/{} tests".format(len(self.tests), total))
        if len(self.tests) != total:
            print("Dropped {}!".format(total - len(self.tests)))
        self.test_suites.append(TestSuite(
            self.suite_name,
            self.tests,
            None,
            self.suite_id,
            None,
            timestamp)) #Timestamp
        self.test_finished = True

    def get_xml(self):
        """ Render XML """
        return TestSuite.to_xml_string(self.test_suites)

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
                classname=self.suite_name, # classname
                elapsed_sec=timestamp - self.last_test, # Duration
                stdout=self.assertions,
                stderr=None,
                assertions=len(self.assertions),
                timestamp=timestamp, # Timestamp
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
            total = int(result.group(4))
            self.finish_suite(total, timestamp)
