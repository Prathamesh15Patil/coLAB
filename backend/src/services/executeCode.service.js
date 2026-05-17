import createTempDir from "../utils/createTempDir.js";
import cleanupTempDir from "../utils/cleanupTempDir.js";
import writeExecutionFiles from "../utils/writeExecutionFiles.js";
import language_config from "../config/language.config.js";
import runCommand from "../utils/runCommand.js";

//take code from user(student) and input(faculty) .
//then create the temp dir and add execution files to it.
//Send this set to runCommand
//Handle respose from it and delete the temp dir

const executeCode = async (code, language, input = "") => {
  let executionDir;

  try {
    const config = language_config[language];
    if (!config) {
      throw new Error("Unsupported language");
    }
    executionDir = await createTempDir();

    await writeExecutionFiles(executionDir, config.fileName, code, input);

    const args = [
      "run",
      "--rm",
      "-i",
      "--memory=128m",
      "--cpus=0.5",
      "--network",
      "none",
      "-v",
      `${executionDir}:/workspace`,
      config.image,
      ...config.command.split(" "),
    ];

    const result = await runCommand("docker", args, input);
    return result;
  } finally {
    if (executionDir) {
      await cleanupTempDir(executionDir);
    }
  }
};

export default executeCode;
