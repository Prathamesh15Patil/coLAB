import { request } from "./apiClient";

export const submitAssignment = async (
  assignmentId,
  code,
  output,
  studentsInRoom = [],
) => {
  try {
    const response = await request("/api/submission/submit", {
      method: "POST",
      body: JSON.stringify({
        assignmentId,
        code,
        output,
        studentsInRoom,
      }),
    });
    return response;
  } catch (error) {
    throw error;
  }
};

export const submitSubmissionAssessment = async (submissionId, answers) => {
  try {
    const response = await request(
      `/api/submission/${submissionId}/assessment`,
      {
        method: "POST",
        body: JSON.stringify({ answers }),
      },
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const downloadSubmissionPDF = async (submissionId) => {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const response = await fetch(
      `${API_BASE}/api/submission/${submissionId}/pdf`,
      {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to download PDF");
    }

    // Create a blob and download it
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `submission_${submissionId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw error;
  }
};

export const getSubmissionsByAssignment = async (assignmentId) => {
  try {
    const response = await request(
      `/api/submission/assignment/${assignmentId}`,
      {
        method: "GET",
      },
    );
    return response;
  } catch (error) {
    throw error;
  }
};
