module.exports = {
    
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
      "node_modules"
    ],
    "moduleNameMapper": {
      "common/(.*)": "<rootDir>/../common/src/$1",
      "core/(.*)": "<rootDir>/../core/src/$1",
      "worker/(.*)": "<rootDir>/../worker/src/$1"
    }
  }