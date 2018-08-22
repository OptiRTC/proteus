#!/usr/bin/env python3

"""
Causes appveyor to wait for testing
"""

from os import getenv
from time import sleep, time
import requests

HEADERS = {
    'Authorization' : 'Bearer {}'.format(
        getenv('APPVEYOR_TOKEN'))}
BASE_URI = "https://ci.appveyor.com/api"
INFO_URI = "projects/{}/{}/build/{}".format(
    getenv("APPVEYOR_ACCOUNT_NAME"),
    getenv("APPVEYOR_PROJECT_SLUG"),
    getenv("APPVEYOR_BUILD_VERSION"))
MESSAGE_URI = "build/messages"
TEST_TIMEOUT = 600
TEST_BACKOFF = 30
TEST_POLL_INTERVAL = 30
# Test runners can be up to POLL_INTERVAL
# out of sync, give them some time to sync up
TEST_UPLOAD_INTERVAL = 60

def fetch_test_info():
    """ Queries API for test info """
    return requests.get(
        "{}/{}".format(
            BASE_URI,
            INFO_URI),
        headers=HEADERS).json()

def fetch_test_results():
    """ Downloads and unzips build artifacts """
    info = fetch_test_info()
    print("Waiting for tests")
    start = time()
    while info["build"]["jobs"][0]["testsCount"] == 0:
        if time() - start > TEST_TIMEOUT:
            print("Timed out waiting for tests")
            requests.post(
                "{}/{}".format(
                    BASE_URI,
                    MESSAGE_URI),
                json={
                    "message": "Test TimeOut",
                    "category": "error",
                    "details": "Timed out waiting for test-runners to upload results"
                })
            return
        sleep(TEST_POLL_INTERVAL)
        try:
            info = fetch_test_info()
        except NewConnectionError():
            sleep(TEST_BACKOFF)
        except TimeoutError():
            sleep(TEST_BACKOFF)
    # Finish upload
    sleep(TEST_UPLOAD_INTERVAL)
    print("Tests collected")

fetch_test_results()
