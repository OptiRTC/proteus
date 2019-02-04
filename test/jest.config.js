module.exports = {
    "roots": [
      "<rootDir>/core",
      "<rootDir>/common",
      "<rootDir>/worker"
    ],
    "transform": {
      "^.+\\.tsx?$": "ts-jest"
    },
    "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
    "moduleFileExtensions": [
      "ts",
      "tsx",
      "js",
      "jsx",
      "json",
      "node"
    ],
    "moduleDirectories": [
      "node_modules",
      "core",
      "common",
      "worker",
      "<rootDir>/../common/src",
      "<rootDir>/../core/src",
      "<rootDir>/../worker/src"
    ],
    "moduleNameMapper": {
      "common/(.*)": "<rootDir>/../common/src/$1",
      "core/(.*)": "<rootDir>/../core/src/$1",
      "worker/(.*)": "<rootDir>/../worker/src/$1"
    }
  }