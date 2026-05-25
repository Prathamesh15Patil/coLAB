const language_config = {
  python: {
    fileName: "solution.py",
    image: "codecollab-python",
    command: "python -u /workspace/solution.py",
  },
  java: {
    fileName: "Main.java",
    image: "amazoncorretto:21",
    command: "java /workspace/Main.java",
  },
  // javascript: {
  //     fileName: "solution.js",
  //     image: "node:22",
  //     command: "node /workspace/solution.js"
  // }
};

export default language_config;
