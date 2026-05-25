import { spawn } from "child_process";
//spawn : spawn() is a method from Node.js's built-in child_process module used to launch a new external process asynchronously without blocking the main event loop

//we also have another tool like this exec() -> but we are not using it because exec() store the complete output into disk  buffer where as spawn() streams directly without consuming space.

// command → executable name ("docker")
// args → array of arguments
// input → text to send to stdin
// timeoutMs → maximum allowed execution time

const runCommand = async (command, args, input = "", timeoutMs = 5000) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputExceeded = false;

    const MAX_OUTPUT_SIZE = 1024 * 1024; // 1 MB

    // Capture stdout
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();

      // Check output limit here
      if (stdout.length > MAX_OUTPUT_SIZE) {
        outputExceeded = true;
        child.kill("SIGKILL");
      }
    });

    // Capture stderr
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();

      // Optional: also limit stderr
      if (stderr.length > MAX_OUTPUT_SIZE) {
        outputExceeded = true;
        child.kill("SIGKILL");
      }
    });

    // Send stdin
    child.stdin.write(input);
    child.stdin.end();

    // Timeout handler
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    // Resolve only when process fully closes
    child.on("close", (exitCode) => {
      clearTimeout(timer);

      resolve({
        stdout,
        stderr,
        exitCode: timedOut ? null : exitCode,
        timedOut,
        outputExceeded,
      });
    });

    // Process spawn error
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

export default runCommand;
