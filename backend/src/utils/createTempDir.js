// Every code execution request must run in its own isolated working directory.

// Without unique directories, two users running code simultaneously could overwrite each other's files.

// This utility should:
// Ensure a root temp/ directory exists.
// Generate a unique execution folder name.
// Create the folder.
// Return the absolute path.

import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const rootTempDir =
  process.env.EXECUTION_TEMP_DIR || path.resolve(process.cwd(), "exe-temp");

const createTempDir = async () => {
  try {
    await fs.promises.mkdir(rootTempDir, { recursive: true });

    const executionDir = path.join(rootTempDir, uuidv4());

    await fs.promises.mkdir(executionDir);

    return executionDir;
  } catch (error) {
    console.error("Failed to create temp directory:", error);
    throw error;
  }
};

export default createTempDir;
