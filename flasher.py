#!/usr/bin/env python3

""" Flashes firmware to devices """

from os import path
from subprocess import Popen, PIPE

from time import sleep, time
import serial


class BaseFlasher():
    """ Base class / test mockup """
    FLASH_WAIT_TIME = 6  # Experimentally determined on Ubuntu VM
    MAX_RETRIES = 3
    ENABLE_DEBUG = False

    def __init__(self, binfile, config):
        self.binfile = binfile
        self.config = config

    def wait_for_serial(self):  # pylint:disable=R0201
        """ Blocks until serial port exists and is ready """
        return True

    def set_flash_mode(self):  # pylint:disable=R0201
        """ Puts the device into flash mode """
        return True

    def flash(self):  # pylint:disable=R0201
        """ Stubbed out flash command """
        return True

    def debug(self, message):
        """ Prints a debug message"""
        if self.ENABLE_DEBUG:
            print(message)

    @staticmethod
    def factory(binfile, config):
        """ A factory for generating platform specific flashers """
        platform = config.get('Host', 'platform')
        if platform in ('photon', 'electron'):
            return ParticleFlasher(binfile, config)
        return BaseFlasher(binfile, config)


class ParticleFlasher(BaseFlasher):
    """ Flashes firmware to particle platforms """

    FLASH_BAUD = 14400  # Magic baud from Particle
    NEUTRAL_BAUD = 9600
    SERIAL_TIMEOUT = 10

    def __init__(self, binfile, config):
        super().__init__(binfile, config)
        self.port = config.get('Host', 'serial_port')
        self.particle = config.get('Host', 'particle_bin')

    def wait_for_serial(self):
        """ Continually checks for the port, sleeps to rate-limit """
        start = time()
        while not path.exists(self.port):
            sleep(1)
            if (time() - start) > self.FLASH_WAIT_TIME:
                break

    def set_flash_mode(self):
        """ Put particle device into DFU mode via magic baud """
        self.wait_for_serial()
        try:
            ser = serial.Serial(self.port, self.FLASH_BAUD)
            ser.close()
            ser = serial.Serial(self.port, self.NEUTRAL_BAUD)
            ser.close()
        except serial.SerialException:
            return

    def flash(self):
        retries = 0
        flash_cmd = "{} flash --usb {}".format(
            self.particle,
            self.binfile)
        self.wait_for_serial()
        self.debug("Flashing {}".format(self.binfile))
        return_code = None
        while return_code != 0:
            if retries > self.MAX_RETRIES:
                return False
            retries += 1
            self.set_flash_mode()
            sleep(self.FLASH_WAIT_TIME)
            process = Popen(
                [
                    "/bin/sh",
                    "-c",
                    flash_cmd],
                stdin=PIPE,
                stdout=PIPE,
                stderr=PIPE)
            self.debug(process.communicate()[0].decode("utf-8"))
            return_code = process.returncode
        return True
