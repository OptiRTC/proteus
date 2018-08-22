# Proteus
A continuous integration on-device test coordination system that manages deploying to Particle hardware platforms.
Executes unit and integration tests built with spark-unit-test on multiple Particle platforms concurrently.
Collects and uploads test results to CI system.

Compatable with Appveyor. Tested with Raspberry Pi (3 Model B) as test-host.
Tests run on Photon and Electron.
MIT License.

## Prereqs
Setup CI with Appveyor. It is recommended to use an ubuntu image and makefile-based build process.
Ensure all test binaries are built and packaged as artifacts in a zip file.
It is recommened that binaries follow a `bin/<platform>/<bin_name>.bin` structure.

## Installation
- Select a host platform (debian linux based)
- Edit `init/proteus-test-daemon.service` with the user and group to run the daemon
- Run `init/host_setup.sh` to install prereqs, daemon, and copy data to `/usr/local/bin/proteus-test-daemon/`
- Edit `.config` in the `/usr/local/bin/proteus-test-daemon/`
- Modify `proteus.sh` to run your master test file. (See run_test.py.example)
- Author any test-scenarios that are required (Power Cycle or other external-excitation test)

## Test Scenarios
The TestScenario call can be extended to support REST calls for cloud based-configuration, including setting particle variables/function calls. It can take advantage of the GPIOs on the Raspberry Pi (using a mock pin factory on other systems) to provide electrical signals to the device (for example, driving the RST pin high). It is recommended to define a custom class using TestScenario as a base to interface with your custom infrastructure.
