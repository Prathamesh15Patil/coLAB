import { request } from "./apiClient.js";

const getProfile = () => request("/api/user/profile");
const loginUser = (payload) =>
  request("/api/user/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
const registerUser = (payload) =>
  request("/api/user/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
const logoutUser = () =>
  request("/api/user/logout", {
    method: "POST",
  });

export { getProfile, loginUser, registerUser, logoutUser };
