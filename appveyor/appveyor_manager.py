#!/usr/bin/env python3

"""
Connects to appveyor and runs tests
"""

import io
from os import getenv
import zipfile
from time import sleep
import requests
from proteus.test_manager import TestManager


class AppveyorManager(TestManager):
    """ Gets tests artifacts and info from Appveyor """
    HEADERS = {
        'Authorization' : 'Bearer {}'.format(
            getenv('CI_API_TOKEN'))}
    BUILD_FILE = TestManager.BASE_DIR + "build_log.txt"
    BASE_URI = "https://ci.appveyor.com/api"
    INFO_URI = "projects/{}/{}".format(
        getenv('APPVEYOR_ACCOUNT_NAME'),
        getenv('APPVEYOR_PROJECT_SLUG'))
    ARTIFACT_URI = "buildjobs/{}/artifacts"
    POLL_INTERVAL = 60
    STATE_IDLE = 0
    STATE_RUNNING = 1

    def __init__(self,
                 platform="electron",
                 user_app="user.bin",
                 test_path=None,
                 scenario_path=None):
        self.build_dir = "appveyor"
        if test_path is None:
            test_path = "{}/bin/{}/".format(self.build_dir, platform)
        
        super().__init__(platform, user_app, test_path, scenario_path)
        self.poller = None
        self.last_build = ""
        with open(self.BUILD_FILE, "r") as file:
            # No reason to keep it all in memory
            self.last_build = file.readlines()[-1]
        self.pending_build = self.last_build

        print("Last build {}".format(self.last_build))
        self.state = self.STATE_IDLE

    def fetch_build_info(self):
        """ Queries API for build info """
        return requests.get(
            "{}/{}".format(
                self.BASE_URI,
                self.INFO_URI),
            headers=self.HEADERS).json()

    def fetch_build_artifacts(self, job_id):
        """ Downloads and unzips build artifacts """
        print("Fetching artifacts to {}".format(self.build_dir))
        build_uri = "{}/{}".format(
            AppveyorManager.BASE_URI,
            AppveyorManager.ARTIFACT_URI.format(job_id))
        artifacts = requests.get(
            build_uri,
            headers=AppveyorManager.HEADERS).json()
        build_stream = requests.get(
            "{}/{}".format(
                build_uri,
                artifacts[0]["fileName"]),
            headers=AppveyorManager.HEADERS)
        build_zip = zipfile.ZipFile(io.BytesIO(build_stream.content))
        build_zip.extractall(path=self.build_dir)
        print("Artifacts extracted")

    def publish_tests(self, job_id, xml_file):
        """ Uploads XML to result endpoint """
        result_uri = "{}/testresults/junit/{}".format(
            self.BASE_URI,
            job_id)
        print("Upload to: {}".format(result_uri))
        return requests.post(result_uri,
                             files={'file': open(xml_file, 'rb')},
                             headers=AppveyorManager.HEADERS)

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
                self.run_tests("test_results.xml")
                self.publish_tests(job_id, "test_results.xml")
                self.last_build = result["build"]["version"]
                self.log_build()
                print("Resuming idle state")
                self.state = self.STATE_IDLE
            else:
                if self.pending_build != result["build"]["version"]:
                    self.pending_build = result["build"]["version"]
                    print("No artifacts for {} yet".format(self.pending_build))

    def run(self):
        """ Runs poll as a daemon """
        while True:
            self.poll()
            sleep(self.POLL_INTERVAL)

    def log_build(self):
        """ Writes last build info to file """
        with open(self.BUILD_FILE, "w") as file:
            build = str(self.last_build)
            print("Logging {}".format(build))
            file.write("{}\n".format(build))
            file.close()
