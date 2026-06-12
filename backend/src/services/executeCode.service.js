import createTempDir from "../utils/createTempDir.js";
import cleanupTempDir from "../utils/cleanupTempDir.js";
import writeExecutionFiles from "../utils/writeExecutionFiles.js";
import language_config from "../config/language.config.js";
import runCommand from "../utils/runCommand.js";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

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
    // const files = await fs.promises.readdir(executionDir);
    // console.log("Files Written:", files);

    const hostExecutionDir = executionDir
      .replace(
        process.env.EXECUTION_TEMP_DIR,
        process.env.HOST_EXECUTION_TEMP_DIR,
      )
      .replaceAll("/", "\\");
    console.log("Host Execution Dir:", hostExecutionDir);

    const args = [
      "run",
      "--rm",
      "-i",
      "--memory=128m",
      "--cpus=0.5",
      "--network",
      "none",
      "-v",
      `${hostExecutionDir}:/workspace`,
      config.image,
      ...config.command.split(" "),
    ];

    // console.log("Execution Dir:", executionDir);
    // console.log("Docker Mount:", `${executionDir}:/workspace`);

    const result = await runCommand("docker", args, input);
    return result;
  } finally {
    if (executionDir) {
      await cleanupTempDir(executionDir);
      // console.log("clean-up pasued");
    }
  }
};

export default executeCode;
