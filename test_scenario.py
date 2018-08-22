"""
Provides a test framework for complex scenarios
"""
from queue import Queue
import sys
from threading import Thread
from time import time, sleep

from serial import Serial
from gpiozero import DigitalOutputDevice
from proteus.serial_thread import ReadlineSerial


class TestEvent():
    """
    An object to handle a action-expectation pair
    """
    def __init__(self, test_function, assertion=None):
        self.assertion = assertion
        self.expectiation = None
        self.value = True
        self.test_function = test_function

    def expect(self, value, error_msg="Unexpected Failure"):
        """ Sets the expectation (chain on creating an action) """
        self.expectiation = value
        self.assertion = error_msg

    def run(self):
        """ Executes the action and compares the results against th expectation """
        self.value = self.test_function()
        if self.expectiation is not None:
            return self.value == self.expectiation
        return True

    def error(self):
        """ Retreives error text """
        if self.assertion is not None:
            return "Assertion: " + self.assertion
        return "Unexpected Failure"


class TestScenario(Thread):
    """
    Base class with tools to define a test scenarios
    Add custom methods for things like REST calls
    Or data-loading, uses serial port to parse messages
    """

    TIMEOUT = 60
    RST_SETTLE_TIME = 1
    RST_PIN = 23
    SERIAL_SLEEP = 6
    SERIAL_BAUD = 115200
    CONFIGURATRON_BIN = "configuratron.exe"

    def __init__(self, name, port="/dev/ttyACM0"):
        super().__init__()
        self.name = name
        self.messages = Queue()
        self.writes = Queue()
        self.port = port
        self.serial_device = None
        self.serial_thread = None
        self.blocked = False
        self.events = []
        self.rst_pin = DigitalOutputDevice(self.RST_PIN, active_high=False)
        self.power_cycle()
        self.open_serial()

    def open_serial(self):
        """ PRIVATE: Opens the serial interface """
        sleep(self.SERIAL_SLEEP)
        self.serial_device = Serial(self.port, self.SERIAL_BAUD)
        self.serial_thread = ReadlineSerial(self.serial_device, self.messages, self.writes)
        self.serial_thread.start()

    def test_pass(self):
        """ PRIVATE: Prints a pass message in a format thunder_test understands """
        print("Test {} passed.".format(self.name))
        print("Test summary: {} passed,"
              " {} failed, and {} skipped,"
              " out of {} tests.".format(1, 0, 0, 1))
        self.serial_thread.stop()
        self.serial_device.close()
        sys.exit(0)

    def test_fail(self, assertion):
        """ PRIVATE: Prints a failure message in a format thunder_test understands """
        print("Assertion {}: {}".format(self.name, assertion))
        print("Test {} failed.".format(self.name))
        print("Test summary: {} passed,"
              " {} failed, and {} skipped,"
              " out of {} test(s).".format(0, 1, 0, 1))
        self.serial_thread.stop()
        self.serial_device.close()
        sys.exit(1)

    def unblock(self):
        """ PRIVATE: Sets blocked to false, bound function """
        self.blocked = False

    def wait_for(self, event):
        """ PRIVATE: Runs a loop with a timeout waiting for a positive event result """
        self.blocked = True
        start = time()
        while (time() - start) < self.TIMEOUT:
            if event.run():
                self.unblock()
                return True
        return False

    def wait_message(self, message, error_msg="Message Timeout"):
        """ Waits for a specific message on the serial port """
        def _message_wait():
            if not self.messages.empty():
                msg = self.messages.get()
                self.messages.task_done()
                if msg == message:
                    return True
            return False
        event = TestEvent(_message_wait, error_msg)
        self.events.append(event)
        return event

    def wait_seconds(self, seconds, error_msg="Error Waiting"):
        """ Waits for a number of seconds that must be less than TIMEOUT """
        def _second_wait():
            if seconds > self.TIMEOUT:
                print("TIMEOUT Tautology")
                return False
            sleep(seconds)
            return True
        event = TestEvent(_second_wait, error_msg)
        self.events.append(event)
        return event

    def power_cycle(self):
        """ Gives a pulse (active low) on the RST pin """
        def _power_cycle():
            self.serial_thread.stop()
            self.serial_device.close()
            self.rst_pin.on()
            sleep(self.RST_SETTLE_TIME)
            self.rst_pin.off()
            self.open_serial()
            return True
        event = TestEvent(_power_cycle)
        self.events.append(event)
        return event

    def run(self):
        """ Runs the test """
        print("Starting {}".format(self.name))
        while self.events:
            if not self.blocked:
                event = self.events.pop(0)
                if not self.wait_for(event):
                    self.test_fail(event.error())
        self.test_pass()
