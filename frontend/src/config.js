const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:7000";

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");
