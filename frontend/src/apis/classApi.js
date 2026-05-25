import { request } from "./apiClient.js";

const getMyClasses = () => request("/api/class/my-classes");
const createClass = (payload) =>
  request("/api/class/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
const updateClass = (classId, payload) =>
  request(`/api/class/${classId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
const deleteClass = (classId) =>
  request(`/api/class/${classId}`, {
    method: "DELETE",
  });
const joinClass = (classId) =>
  request("/api/class/join", {
    method: "POST",
    body: JSON.stringify({ classId }),
  });
const leaveClass = (classId) =>
  request(`/api/class/${classId}/leave`, {
    method: "PUT",
  });

export {
  getMyClasses,
  createClass,
  updateClass,
  deleteClass,
  joinClass,
  leaveClass,
};
