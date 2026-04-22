import { API_BASE_URL } from "./config";

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }
  return data;
}

export function register(payload) {
  return request("/register", { method: "POST", body: payload });
}

export function login(payload) {
  return request("/login", { method: "POST", body: payload });
}

export function fetchMe(token) {
  return request("/me", { token });
}

export function fetchExpenses(token, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      params.append(key, value);
    }
  });
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/expenses${suffix}`, { token });
}

export function fetchSummary(token) {
  return request("/expenses/summary", { token });
}

export function createExpense(token, payload) {
  return request("/expense", { method: "POST", token, body: payload });
}

export function updateExpense(token, id, payload) {
  return request(`/expense/${id}`, { method: "PUT", token, body: payload });
}

export function deleteExpense(token, id) {
  return request(`/expense/${id}`, { method: "DELETE", token });
}
