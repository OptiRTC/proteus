""" Messaging protocl for Proteus"""

from datetime import datetime

class ProteusMessage:
    """ A base class for protocol messages"""
    last_identifier = 0
    DATE_FORMAT = "%Y%m%d%H%M%S"

    def __init__(self, name, timestamp):
        self.identifier = ProteusMessage.last_identifier
        ProteusMessage.last_identifier += 1
        self.name = name
        self.timestamp = timestamp

    def serialize(self):
        """ Serializes self to dictionary for transport"""
        return {
            "identifier": self.identifier,
            "name": self.name,
            "timestamp": self.timestamp.strftime(ProteusMessage.DATE_FORMAT)
        }

    def deserialize(self, serialized):
        """ Deserializes self from a dictionary"""
        self.identifier = serialized["identifier"]
        self.name = serialized["name"]
        self.timestamp = datetime.strptime(
            serialized["timestamp"],
            ProteusMessage.DATE_FORMAT)

class ProteusJob(ProteusMessage):
    """ A job from an adapter, describes a build """

    def __init__(self, name, timestamp):
        super().__init__(name, timestamp)
        self.build_string = None
        self.result_url = None
        self.artifact_url = None

    def serialize(self):
        """ Serializes self to dictionary for transport"""
        serialized = super().serialize()
        serialized["build_string"] = self.build_string
        serialized["result_url"] = self.result_url
        serialized["artifact_url"] = self.artifact_url

    def deserialize(self, serialized):
        """ Deserializes self form a dictionary"""
        super().deserialize(serialized)
        self.build_string = serialized["build_string"]
        self.result_url = serialized["result_url"]
        self.artifact_url = serialized["artifact_url"]

class ProteusWorkflow(ProteusMessage):
    """ A workflow from the proteus core, breaks job into work units"""

    def __init__(self, job, platforms=None, groups=None):
        super().__init__(job.name, job.timestamp)
        if platforms is None:
            platforms = [
                'electron',
                'photon']
        self.platforms = platforms
        if groups is None:
            groups = ['default']
        self.groups = groups
        self.artifact_url = None
        self.job_id = None

class ProteusTask(ProteusMessage):
    """ A task to be run on a worker """

    def __init__(self, workflow, platform, group):
        super().__init__(workflow.name, workflow.timestamp)
        self.platform = platform
        self.group = group
        self.worker = None
        self.results = None
        self.workflow_id = workflow.identifier
