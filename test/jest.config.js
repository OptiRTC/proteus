module.exports = {
    "roots": [
      "<rootDir>/core",
      "<rootDir>/common"
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
      "<rootDir>/../common/src",
      "<rootDir>/../core/src"
    ],
    "moduleNameMapper": {
      "common:(.*)": "<rootDir>/../common/src/$1",
      "core:(.*)": "<rootDir>/../core/src/$1"
    }
  }