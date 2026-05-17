import path from "path";
import fs from "fs";

const writeExecutionFiles = async (
  executionDir,
  filename,
  code,
  input = "",
) => {
  const sourceFilePath = path.join(executionDir, filename);
  await fs.promises.writeFile(sourceFilePath, code);
  const inputFilePath = path.join(executionDir, "input.txt");
  await fs.promises.writeFile(inputFilePath, input);

  return { sourceFilePath, inputFilePath };
};

export default writeExecutionFiles;
