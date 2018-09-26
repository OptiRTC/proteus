#!/usr/bin/env python3

"""
Connects to appveyor and runs tests
"""

import io
import zipfile
from time import sleep, time
import requests
from proteus.test_manager import TestManager


class AppveyorManager(TestManager):
    """ Gets tests artifacts and info from Appveyor """

    BASE_URI = "https://ci.appveyor.com/api"
    INFO_URI = "projects/{}/{}"
    ARTIFACT_URI = "buildjobs/{}/artifacts"
    STATE_IDLE = 0
    STATE_RUNNING = 1

    def __init__(self, configfile):
        super().__init__(configfile)
        self.headers = {'Authorization': 'Bearer {}'.format(
            self.config.get('CI', 'ci_api_token'))}
        self.poller = None
        self.last_build = ""
        with open(self.config.get('Appveyor', 'build_file'), "r") as file:
            # No reason to keep it all in memory
            self.last_build = file.readlines()[-1]
        self.pending_build = self.last_build

        print("Last build {}".format(self.last_build))
        self.state = self.STATE_IDLE
        self.poll_interval = self.config.getint('CI', 'ci_idle_build_poll_interval_seconds')

    def info_uri(self):
        """ Builds the info uri """
        return self.INFO_URI.format(
            self.config.get('Appveyor', 'account_name'),
            self.config.get('Appveyor', 'project_slug'))

    def fetch_build_info(self):
        """ Queries API for build info """
        return requests.get(
            "{}/{}".format(
                self.BASE_URI,
                self.info_uri()),
            headers=self.headers).json()

    def fetch_build_artifacts(self, job_id):
        """ Downloads and unzips build artifacts """
        print("Fetching artifacts to {}".format(self.config.get('Appveyor', 'artifact_path')))
        build_uri = "{}/{}".format(
            AppveyorManager.BASE_URI,
            AppveyorManager.ARTIFACT_URI.format(job_id))
        artifacts = requests.get(
            build_uri,
            headers=self.headers).json()
        build_stream = requests.get(
            "{}/{}".format(
                build_uri,
                artifacts[0]["fileName"]),
            headers=self.headers)
        build_zip = zipfile.ZipFile(io.BytesIO(build_stream.content))
        build_zip.extractall(path=self.config.get('Appveyor', 'artifact_path'))
        print("Artifacts extracted")

    def publish_tests(self, job_id, xml_file):
        """ Uploads XML to result endpoint """
        result_uri = "{}/testresults/junit/{}".format(
            self.BASE_URI,
            job_id)
        print("Upload to: {}".format(result_uri))
        return requests.post(result_uri,
                             files={'file': open(xml_file, 'rb')},
                             headers=self.headers)

    def poll(self):
        """ Checks if the latest build successed, and runs tests """
        if not self.state == self.STATE_IDLE:
            print("Tests Running...")
            return
        result = self.fetch_build_info()
        if self.last_build != result["build"]["version"]:
            if result["build"]["jobs"][0]["artifactsCount"] > 0:
                print("Running tests for {}".format(result["build"]["version"]))
                self.state = self.STATE_RUNNING
                job_id = result["build"]["jobs"][0]["jobId"]
                self.fetch_build_artifacts(job_id)
                self.run_tests("{}_{}.xml".format(
                    self.config.get('Host', 'result_prefix'),
                    time()))
                self.publish_tests(job_id, "test_results.xml")
                self.last_build = result["build"]["version"]
                self.log_build()
                print("Resuming idle state")
                self.state = self.STATE_IDLE
                self.poll_interval = self.config.getint('CI', 'ci_idle_build_poll_interval_seconds')
            else:
                if self.pending_build != result["build"]["version"]:
                    self.pending_build = result["build"]["version"]
                    self.poll_interval = self.config.getint(
                        'CI',
                        'ci_new_build_poll_interval_seconds')
                    print("No artifacts for {} yet".format(self.pending_build))

    def run(self):
        """ Runs poll as a daemon """
        while True:
            self.poll()
            sleep(self.poll_interval)

    def log_build(self):
        """ Writes last build info to file """
        with open(self.config.get('Appveyor', 'build_file'), "w") as file:
            build = str(self.last_build)
            print("Logging {}".format(build))
            file.write("{}\n".format(build))
            file.close()
