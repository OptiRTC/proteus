#!/usr/bin/env python3

"""
Runs a python worker
"""

from configparser import ConfigParser

class Worker:
    """A proteus client for executing tests and returning results"""
    DEFAULT_CONFIGFILE = '/usr/local/proteus/config'
    STATE_IDLE = "idle"
    STATE_BUSY = "busy"
    STATE_ERROR = "error"

    def __init__(self, config_file=None):
        if config_file is None:
            config_file = self.DEFAULT_CONFIGFILE
        config = ConfigParser()
        config.read(config_file)

        self.root_url = config.get('Worker', 'root_url')
        self.task_server = config.get('Worker', 'proteus_url')
        self.worker_id = config.get('Worker', 'worker_id')
        self.pool_id = config.get('Worker', 'pool_id')
        self.discovery_topic = config.get('Worker', 'discovery_url')
        self.state = self.STATE_IDLE
