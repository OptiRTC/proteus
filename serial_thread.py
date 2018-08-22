#!/usr/bin/env python3

"""
This module opens a serial port on a thread.
All processing is done on other threads using concurrent queues.
This decouples any processing latency from reading the port,
reducing the probability of dropping serial messages.
"""

from queue import Queue
from threading import Thread, Event
from serial import SerialException


class StopSignalThread(Thread):
    """ A thread that uses the stop() method to halt """
    def __init__(self):
        super().__init__()
        self._req_stop = Event()

    def run(self):
        """ Runs the thread until stop is set """
        while not self._req_stop.is_set():
            self.exec() #pylint: disable=E1101

    def stop(self):
        """ Signals the thread to stop """
        self._req_stop.set()


class SerialThread(StopSignalThread):
    """ Reads from a serial port as fast as possible """
    def __init__(self, conn, byte_queue, writes):
        super().__init__()
        self.connection = conn
        self.byte_queue = byte_queue
        self.write_queue = writes

    def exec(self):
        """ Runs the thread """
        try:
            self.byte_queue.put(
                self.connection.read(
                    max(1,
                        self.connection.inWaiting())))
            if not self.write_queue.empty():
                self.connection.write(self.write_queue.get())
                self.write_queue.task_done()
        except SerialException:
            self.connection.close()
            self._req_stop.set()
            return


class NewlineThread(StopSignalThread):
    """ Checks an incoming byte stream for newlines """
    def __init__(self, byte_queue, line_queue, ending=b"\r\n"):
        super().__init__()
        self.buffer = bytearray()
        self.line_end = ending
        self.byte_queue = byte_queue
        self.line_queue = line_queue

    def exec(self):
        """ Runs the thread """
        if not self.byte_queue.empty():
            newbytes = self.byte_queue.get()
            self.byte_queue.task_done()
            self.getline(newbytes)

    def getline(self, newbytes):
        """ Look for a newline in the data queue """
        self.buffer.extend(newbytes)
        chunks = self.buffer.split(self.line_end)
        for line in chunks[:-1]:
            self.line_queue.put(line.decode("utf-8"))
        self.buffer[0:] = chunks[-1]


class ReadlineSerial():
    """ Connects a NewlineThread with a SerialThread """
    def __init__(self, conn, line_queue, writes):
        self.byte_queue = Queue()
        self.serial = SerialThread(conn, self.byte_queue, writes)
        self.newlines = NewlineThread(self.byte_queue, line_queue)

    def start(self):
        """ Starts child threads """
        self.serial.start()
        self.newlines.start()

    def stop(self):
        """ Stops child threads """
        self.serial.stop()
        self.newlines.stop()
        self.serial.join()
        self.newlines.join()
