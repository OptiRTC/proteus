# Proteus
A continuous integration on-device test coordination system that manages deploying to Particle hardware platforms.
Able to execute unit and integration tests built with spark-unit-test on multiple Particle platforms concurrently.
Collects and uploads test results to CI system.

Compatible with Appveyor. Tested with Raspberry Pi (3 Model B) as test-host.
Tests run on Photon and Electron.
MIT License.

## Prereqs
Setup CI (as of 9/7/2018 only Appveyor is supported). It is recommended to use an Ubuntu image and makefile-based build process.
Ensure all test binaries are built and packaged as artifacts in a zip file.
It is recommended that binaries follow a `bin/<platform>/<bin_name>.bin` structure. If your CI has an API key record it and save it for use later in this process.
Your on-device tests should be authored with [spark-unit-test](https://github.com/m-mcgowan/spark-unit-test), and should report the results of each test (including assertions) to the serial port (USB Serial) of the test platform.
See the `appveyor.yml.example` for guidance on how to integrate Proteus with appveyor.yml in your repo.
Python dependencies can be installed via `pip3 -r requirements.txt`.

## Installation
- Select a host platform (Debian Linux based)
- Edit `init/proteus.service` with the user and group to run the daemon, making any other changes specific to your system. If you are not using systemd you will need to port the configuration to your init system.
- Run `init/host_setup.sh` to install prereqs, daemon, and copy data to `/usr/local/proteus/`, check that no errors occur.
- Edit `.config` in `/usr/local/proteus/` with your CI API key and any other custom settings.
- Modify `run_test.py` in the proteus folder or modify `proteus.sh` to run your master test file. (See run_test.py.example for a starting point)
- Author any test-scenarios that are required (Power Cycle or other external-excitation test). TestScenario may be used as a base class for proprietary extensions (see `test_scenario.py`). 

### Test Scenarios
The TestScenario call can be extended to support REST calls for cloud based-configuration, including setting particle variables/function calls. It can take advantage of the GPIOs on the Raspberry Pi (using a mock pin factory on other systems) to provide electrical signals to the device (for example, driving the RST pin high). It is recommended to define a custom class inheriting from TestScenario to interface with your custom infrastructure. On systems lacking `gpiozero` compatible hardware the mock pin factory is used to simulate GPIO.

## Running Proteus
The host setup script will install and enable the daemon. Be sure to connect your hardware platform under test via USB to your test platform. Proteus will check CI for new builds at a set interval and automatically download tests, execute them, and report the test results to CI (they will also be saved as an XML file, but will be overwritten when new builds are available).

## Testing Proteus
Using Linux the `test.sh` files are designed to emulate a python library installation for Proteus (they add the appropriate folders to PYTHONPATH and setup some additional PATH for python and it's subshells). It should be possible to run any test.sh folder from the `proteus` root directory.

## Troubleshooting
Proteus generates a `log.txt` file in the Proteus directory. The output of this file can point to misconfiguration or failures in a test. Crash reports and exceptions encountered while running tests will appear in this file.

## Contributing
Proteus is maintained by OptiRTC, although no FTE is dedicated to the project and development in the near-future is conducted as our needs for CI with Particle grow. 

Please use GitHub issues to log bugs. If you are able to find a bug and fix it, please create and link to a PR containing any code changes requested. Before creating a PR please ensure your changes pass the unit and integration tests. One of these tests includes a check that your code is compliant with [PEP8](https://www.python.org/dev/peps/pep-0008/) standards - please adhere to them in all submissions you make.

If you have an additional feature to add to Proteus, please create a PR and submit it to Opti. Opti will review new features and interact with authors on finalizing any new features before accepting them into the project on a recurring basis.
