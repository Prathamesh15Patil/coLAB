import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import executeCode from "../services/executeCode.service.js";

const execute = asyncHandler(async (req, res) => {
  const { code, language, input="" } = req.body;
  if (!code || !language) {
    throw new ApiError(400, "Code and language selection are required!");
  }

  const response = await executeCode(code, language, input);

  if (!response) {
    throw new ApiError(500, "Code execution failed");
  }

  res.status(200).json({
    output = response.stdout,
    error = response.stderr,
    timedOut: response.timedOut,
    exitCode: response.exitCode,
  });
});

export default execute;
