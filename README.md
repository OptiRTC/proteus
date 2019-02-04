# Proteus
A continuous integration on-device test coordination system that manages deploying to hardware platforms.
Able to execute unit and integration tests built with spark-unit-test on multiple Particle platforms concurrently.
Collects and uploads test results to CI system.

Proteus consists of two components: The Core and Worker.
Proteus is setup to build/test with appveyor by default, and implements a plugin to fetch artifacts from Appveyor or local disk.
Proteus is released under the MIT License.

## Prereqs
Setup CI (as of 2/4/2019 only Appveyor is implemented).
Dependecies are managed per-compontent with NPM.

When writing tests to run on a hardware platform, a device layer should be implemented for the platform/unit test combination.
As an example, `ParticleDevice` is implemented for photon/electron and spark-unit-test.

## Installation
- Select a host platform (Debian Linux based)
- Clone this repo
- Run `npm i` in the /proteus, /proteus/core, /proteus/worker, and /proteus/common directories.
- Build the worker by running `npm run build-worker`
- Build the core by running `npm run build-core`

Alternatively download the latest release.

### Test Scenarios
Test scenarios are implemented in javascript (nodejs). They must return a TestResults array of results for each test run, and accept a TestComponent describing the expected results. Scenario javascript files are intended to be included along with the binaries of your project (I.E. include them in Appveyor zip files).

## Running Proteus
To run the worker or core, edit config/default.json for your system.
Core: `node core.js`
Worker: `node worker.js`

Ensure the worker is configured to connect to a system running core. Double check config/default.json.

## Testing Proteus
Tests are run with `npm run test`

## Troubleshooting
By default proteus connects via MQTT. Connecting to the Core via MQTT and observing messages may point to failure points.
Additionally the NPM debugger may be used to inspect execution. We recommend Visual Studio Code as and IDE and have included a launch.config for running the test project.

## Contributing
Proteus is maintained by OptiRTC, although no FTE is dedicated to the project and development in the near-future is conducted as our needs expand. 

Please use GitHub issues to log bugs. If you are able to find a bug and fix it, please create and link to a PR containing any code changes requested. Before creating a PR please ensure all tests pass.

If you have an additional feature to add to Proteus, please create a PR and submit it to Opti. Opti will review new features and interact with authors on finalizing any new features before accepting them into the project on a recurring basis.

### Versioning
Proteus uses semantic versioning.
