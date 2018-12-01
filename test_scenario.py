"""
Provides a test framework for complex scenarios
"""
import re
import sys
from threading import Thread
from time import time, sleep

from gpiozero import DigitalOutputDevice
from proteus.flasher import BaseFlasher


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

    TIMEOUT = 30
    FLASH_SETTLE_TIME = 5
    FLASH_SETTLE_TIMEOUT = 60
    RST_SETTLE_TIME = 3
    RST_PIN = 23

    STATUS_IDLE = 0
    STATUS_RUNNING = 1
    STATUS_ERROR = 2
    STATUS_FINISHED = 3

    ENABLE_DEBUG = False

    def __init__(self, name, config, channel):
        super().__init__()
        self.name = name
        self.config = config
        self.channel = channel
        self.blocked = False

        self.events = []
        self.total_events = 0

        self.current_progress = 0
        self.total_progress = 0

        self.rst_pin = DigitalOutputDevice(self.RST_PIN, active_high=False)
        self.check_channel = False
        self.output_stream = None
        self.status = TestScenario.STATUS_IDLE
        self.power_cycle()

    def print(self, msg):
        """PRIVATE: Outputs to a queue, array, stream, and print"""
        if self.ENABLE_DEBUG:
            print(msg)
        if self.output_stream is not None:
            self.output_stream.append(msg)

    def test_pass(self):
        """ PRIVATE: Prints a pass message in a format thunder_test understands """
        self.print("Test {} passed.".format(self.name))
        self.print("Test summary: {} passed,"
                   " {} failed, and {} skipped,"
                   " out of {} tests.".format(1, 0, 0, 1))
        self.status = TestScenario.STATUS_FINISHED

    def test_fail(self, assertion):
        """ PRIVATE: Prints a failure message in a format thunder_test understands """
        self.print("Assertion {}: {}".format(self.name, assertion))
        self.print("Test {} failed.".format(self.name))
        self.print("Test summary: {} passed,"
                   " {} failed, and {} skipped,"
                   " out of {} test(s).".format(0, 1, 0, 1))
        self.status = TestScenario.STATUS_FINISHED

    def test_error(self, message):
        """ PRIVATE: Prints a failure message"""
        self.print("Assertion {}: {}".format(self.name, message))
        self.print("Test {} failed.".format(self.name))
        self.print("Test summary: {} passed,"
                   " {} failed, and {} skipped,"
                   " out of {} test(s).".format(0, 1, 0, 1))
        self.status = TestScenario.STATUS_ERROR

    def unblock(self):
        """ PRIVATE: Sets blocked to false, bound function """
        self.blocked = False

    def cleanup(self):
        """ Closes threads, pins, and other resources"""
        self.channel.close()
        self.rst_pin.close()

    def block_until_device_idle(self):
        """ Loops until the device boots back into good state """
        self.debug("Waiting for devce...")
        start = time()
        while not self.channel.open() and (time() - start) < self.FLASH_SETTLE_TIMEOUT:
            sleep(self.FLASH_SETTLE_TIME)
        self.debug("Device opened")

    def wait_for(self, event):
        """ PRIVATE: Runs a loop with a timeout waiting for a positive event result """
        self.blocked = True
        start = time()
        self.current_progress = 0
        self.total_progress = self.TIMEOUT
        while self.current_progress < self.TIMEOUT:
            self.current_progress = (time() - start)
            self.render_progress()
            if event.run():
                self.unblock()
                return True
        return False

    def wait_message(self, message, error_msg="Message Timeout"):
        """ Waits for a specific message on the serial port """
        def _message_wait():
            if not self.channel.input.empty() and self.channel.alive():
                msg = self.channel.input.get()
                self.channel.input.task_done()
                if msg == message:
                    return True
            return False
        event = TestEvent(_message_wait, error_msg)
        self.events.append(event)
        return event

    def wait_regex(self, regex, error_msg="RegEx Timeout"):
        """ Waits for a regex to be matched on the serial port """
        prog = re.compile(regex)

        def _regex_wait():
            if not self.channel.input.empty() and self.channel.alive():
                msg = self.channel.input.get()
                self.channel.input.task_done()
                return prog.search(msg) is not None
            return False
        event = TestEvent(_regex_wait, error_msg)
        self.events.append(event)
        return event

    def send_message(self, message, error_msg="Could not send Message"):
        """ Attempts to send a message to the channel """
        def _message_send():
            if self.channel.alive():
                self.channel.output.put(message)
                return True
            return False
        event = TestEvent(_message_send, error_msg)
        self.events.append(event)
        return event

    def wait_seconds(self, seconds, error_msg="Error Waiting"):
        """ Waits for a number of seconds that must be less than TIMEOUT """
        def _second_wait():
            if seconds > self.TIMEOUT:
                self.debug("Test Design Error: Wait exceeds timeout")
                return False
            sleep(seconds)
            return True
        event = TestEvent(_second_wait, error_msg)
        self.events.append(event)
        return event

    def power_cycle(self):
        """ Gives a pulse (active low) on the RST pin """
        self.power_off()
        self.power_on()

    def power_off(self):
        """ Drive RST ON """
        def _power_off():
            self.check_channel = False
            self.channel.close()
            self.rst_pin.on()
            sleep(self.RST_SETTLE_TIME)
            return True
        event = TestEvent(_power_off)
        self.events.append(event)
        return event

    def power_on(self):
        """ Drive RST OFF """
        def _power_on():
            self.check_channel = True
            self.rst_pin.off()
            sleep(self.FLASH_SETTLE_TIME)
            return self.channel.open()
        event = TestEvent(_power_on)
        self.events.append(event)
        return event

    def run(self):
        """ Runs the test """
        error_count = 0
        self.total_events = len(self.events)
        self.print("Starting {}".format(self.name))
        self.status = TestScenario.STATUS_RUNNING
        self.block_until_device_idle()
        while self.events and self.status == TestScenario.STATUS_RUNNING:
            self.render_progress()
            if not self.blocked:
                event = self.events.pop(0)
                if not self.wait_for(event):
                    self.test_fail(event.error())
                    return
            if self.check_channel and not self.channel.alive():
                error_count += 1
                self.channel.close()
                if not self.channel.open():
                    self.debug("Unexpected communication failure")
                    sleep(self.FLASH_SETTLE_TIME)
                else:
                    error_count = 0
            if error_count > 3:
                self.test_error("Too many errors, aborting")
                return
        self.test_pass()

    def flash_firmware(self, binfile, error_msg="Failed to flash"):
        """ Flashes a bin file to device """
        flasher = BaseFlasher.factory(binfile, self.config)

        def _flash_new_fw():
            self.channel.close()
            flasher.flash()
            self.block_until_device_idle()
        event = TestEvent(_flash_new_fw, error_msg)
        self.events.append(event)
        return event

    def wait_device(self, error_msg="Device did not connect within timeout"):
        """ Waits for device to connect to host """
        # Wait device should close over started

        started = False  # pylint:disable=W0612

        def _wait_device():
            nonlocal started
            if not started:  # pylint:disable=E0601
                started = True
                self.check_channel = False
                self.channel.close()
            else:
                if self.channel.open():
                    self.check_channel = True
                    return True
            return False
        event = TestEvent(_wait_device, error_msg)
        self.events.append(event)
        return event

    def debug(self, msg="DEBUG"):
        """ Emits a debug message to the console """
        def _print_debug():
            if self.ENABLE_DEBUG:
                print(msg)
            return True
        event = TestEvent(_print_debug, "debug print failed")
        self.events.append(event)
        return event

    def render_progress(self):
        """ Draws task progress and overall progress """
        if self.ENABLE_DEBUG:
            return
        def render_bar(progress):
            sys.stdout.write('[')
            step = 3
            for i in range(step, 100 + step, step):
                if (progress / i) > 1:
                    sys.stdout.write("=")
                else:
                    if (progress - i + step) > 0:
                        character = int(time() % 4)
                        if character == 0:
                            character = '|'
                        elif character == 1:
                            character = '/'
                        elif character == 2:
                            character = '-'
                        elif character == 3:
                            character = '\\'
                        else:
                            character = '*'
                        sys.stdout.write(character)
                    else:
                        sys.stdout.write(' ')
            sys.stdout.write(']')

        if self.total_progress == 0:
            self.total_progress = 1
        if self.total_events == 0:
            self.total_events = 1
        overall = int(100 * ((self.total_events - len(self.events)) / self.total_events))
        task = int(100 * (self.current_progress / self.total_progress))
        render_bar(overall)
        sys.stdout.write(':')
        render_bar(task)
        sys.stdout.write("\r")
