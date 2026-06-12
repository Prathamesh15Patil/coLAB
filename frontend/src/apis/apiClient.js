const API_BASE = import.meta.env.VITE_API_URL || "";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.message || response.statusText || "API request failed";
    throw new Error(message);
  }

  return data;
};

export { API_BASE, request };
