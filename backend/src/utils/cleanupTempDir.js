import fs from "fs";

const cleanupTempDir = async (executionDir) => {
  try {
    await fs.promises.rm(executionDir, { recursive: true, force: true });
    console.log("Directory deleted successfully");
  } catch (err) {
    console.error("Error while deleting directory:", err);
  }
};

export default cleanupTempDir;
