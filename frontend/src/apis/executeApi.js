import { request } from "./apiClient.js";

export const runCode = async (code, language, input = "") => {
    return request("/api/execute/run", {
        method: "POST",
        body: JSON.stringify({ code, language, input }),
    });
};
