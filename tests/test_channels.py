#!/usr/bin/env python3

""" Tests the operation of proteus channels """
import unittest
import os
from pty import openpty
from configparser import ConfigParser
from time import sleep
from proteus.communication import Channel, SerialChannel, NewlineChannel, StopSignalThread


class Chatterer(StopSignalThread):
    """ Send test data to a virtual port """

    def __init__(self):
        super().__init__()
        self.master = None

    def open(self):
        """ Opens a pty pair """
        master, slave = openpty()
        self.master = master
        return os.ttyname(slave)

    def close(self):
        """ Closes the pty pair """
        os.close(self.master)

    def exec(self):
        """ Write hello into the pty """
        sleep(1)
        os.write(self.master, "Hello".encode())
        sleep(1)
        os.write(self.master, "Again\r\n".encode())
        self.stop()


class TestChannel(unittest.TestCase):
    """ Tests channels """
    @classmethod
    def setUpClass(cls):
        cls.config = ConfigParser()
        cls.config.read('tests/test_config')

    def test_loopback_channel(self):
        """ Tests a default channel with the TEST config """
        chan = Channel.factory(self.config)
        self.assertTrue(chan.open())
        chan.output.put("Hello")
        sleep(1)
        self.assertFalse(chan.input.empty())
        echo = chan.input.get()
        chan.input.task_done()
        self.assertTrue(type(chan) is Channel) #pylint:disable=C0123
        self.assertEqual(echo, "Hello")
        chan.close()

    def test_serial_thread(self):
        """ Tests a serial channel with virtual ports """
        config = ConfigParser()
        config.read('tests/test_config')
        config.set('Host', 'platform', '')
        thread = Chatterer()
        slavetty = thread.open()
        thread.start()
        config.set('Host', 'serial_port', slavetty)
        
        ser = SerialChannel(config)
        self.assertTrue(ser.open())
        self.assertTrue(ser.alive())
        msg = b''
        while ser.input.empty() and ser.alive():
            msg = ser.input.get()
            ser.input.task_done()
            sleep(1)
        ser.close()
        thread.stop()
        thread.close()
        thread.join()
        self.assertEqual(msg, b'H')

    def test_newline_serial_thread(self):
        """ Tests the newline serial thread with virtual ports"""
        config = ConfigParser()
        config.read('tests/test_config')
        config.set('Host', 'platform', '')
        thread = Chatterer()
        slavetty = thread.open()
        config.set('Host', 'serial_port', slavetty)
        thread.start()
        ser = NewlineChannel(config)
        self.assertTrue(ser.open())
        self.assertTrue(ser.alive())
        while ser.input.empty() and ser.alive():
            sleep(1)
        msg = ser.input.get()
        ser.input.task_done()
        ser.close()
        thread.stop()
        thread.close()
        thread.join()
        self.assertEqual(msg, "HelloAgain")

if __name__ == '__main__':
    unittest.main()
