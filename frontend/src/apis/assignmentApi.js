import { request } from "./apiClient.js";

const getAssignmentsByClass = (classId) =>
  request(`/api/assignment/class/${classId}`);
const createAssignment = (payload) =>
  request("/api/assignment/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
const updateAssignment = (assignmentId, payload) =>
  request(`/api/assignment/update/${assignmentId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
const deleteAssignment = (assignmentId) =>
  request(`/api/assignment/delete/${assignmentId}`, {
    method: "DELETE",
  });

export {
  getAssignmentsByClass,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};
