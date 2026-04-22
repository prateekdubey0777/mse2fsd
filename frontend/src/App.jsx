import { useEffect, useMemo, useState } from "react";
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  fetchMe,
  fetchSummary,
  login,
  register,
  updateExpense
} from "./api";
import { API_BASE_URL } from "./config";

const CATEGORIES = ["Food", "Travel", "Bills", "Entertainment", "Other"];
const STORAGE_KEY = "mse2fsd-auth";

const emptyExpense = {
  title: "",
  amount: "",
  category: "Food",
  date: new Date().toISOString().slice(0, 10),
  note: ""
};

function App() {
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { token: "", user: null };
  });
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [editingId, setEditingId] = useState("");
  const [filters, setFilters] = useState({ category: "", startDate: "", endDate: "" });
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isLoggedIn = Boolean(auth?.token);

  useEffect(() => {
    if (auth?.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  async function hydrateUser() {
    if (!auth.token) return;
    try {
      const me = await fetchMe(auth.token);
      setAuth((current) => ({ ...current, user: me.user }));
    } catch {
      setAuth({ token: "", user: null });
    }
  }

  async function loadData(currentFilters = filters) {
    if (!auth.token) return;
    setLoading(true);
    setError("");
    try {
      const [expenseRes, summaryRes] = await Promise.all([
        fetchExpenses(auth.token, { ...currentFilters, limit: 100 }),
        fetchSummary(auth.token)
      ]);
      setExpenses(expenseRes.expenses || []);
      setSummary(summaryRes.summary || []);
      setGrandTotal(summaryRes.grandTotal || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!auth.token) return;
    hydrateUser();
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  const topCategory = useMemo(() => {
    if (!summary.length) return "N/A";
    return `${summary[0]._id} (${summary[0].total.toFixed(2)})`;
  }, [summary]);

  function onAuthChange(event) {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register(authForm);
      }
      const loginRes = await login({
        email: authForm.email,
        password: authForm.password
      });
      setAuth({ token: loginRes.token, user: loginRes.user });
      setAuthForm({ name: "", email: "", password: "" });
      setMessage(mode === "register" ? "Registered and logged in." : "Login successful.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function onExpenseChange(event) {
    const { name, value } = event.target;
    setExpenseForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleExpenseSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const payload = {
        ...expenseForm,
        amount: Number(expenseForm.amount)
      };

      if (editingId) {
        await updateExpense(auth.token, editingId, payload);
        setMessage("Expense updated.");
      } else {
        await createExpense(auth.token, payload);
        setMessage("Expense added.");
      }
      setExpenseForm(emptyExpense);
      setEditingId("");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(expense) {
    setEditingId(expense._id);
    setExpenseForm({
      title: expense.title || "",
      amount: expense.amount || "",
      category: expense.category || "Food",
      date: expense.date ? new Date(expense.date).toISOString().slice(0, 10) : "",
      note: expense.note || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await deleteExpense(auth.token, id);
      setMessage("Expense deleted.");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function clearEditor() {
    setEditingId("");
    setExpenseForm(emptyExpense);
  }

  async function applyFilters(event) {
    event.preventDefault();
    await loadData(filters);
  }

  function resetFilters() {
    const reset = { category: "", startDate: "", endDate: "" };
    setFilters(reset);
    loadData(reset);
  }

  function logout() {
    setAuth({ token: "", user: null });
    setExpenses([]);
    setSummary([]);
    setGrandTotal(0);
    setMessage("Logged out.");
    setError("");
  }

  if (!isLoggedIn) {
    return (
      <main className="shell auth-shell">
        <section className="auth-card">
          <p className="chip">MERN Expense Tracker</p>
          <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
          <p className="hint">Backend API: {API_BASE_URL}</p>

          <form onSubmit={handleAuthSubmit} className="grid">
            {mode === "register" && (
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  value={authForm.name}
                  onChange={onAuthChange}
                  placeholder="Prateek"
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                name="email"
                value={authForm.email}
                onChange={onAuthChange}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={onAuthChange}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
            </button>
          </form>

          <p className="switcher">
            {mode === "login" ? "No account?" : "Already registered?"}
            <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create one" : "Login"}
            </button>
          </p>

          {error && <p className="flash flash-error">{error}</p>}
          {message && <p className="flash flash-ok">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="chip">MSE2FSD Dashboard</p>
          <h1>Hi {auth.user?.name || "User"}</h1>
          <p className="hint">Track, filter, and manage expenses across categories.</p>
        </div>
        <button className="secondary" onClick={logout}>
          Logout
        </button>
      </header>

      <section className="stats">
        <article>
          <h3>Total Spent</h3>
          <p>₹ {grandTotal.toFixed(2)}</p>
        </article>
        <article>
          <h3>Total Entries</h3>
          <p>{expenses.length}</p>
        </article>
        <article>
          <h3>Top Category</h3>
          <p>{topCategory}</p>
        </article>
      </section>

      <section className="panel">
        <h2>{editingId ? "Edit Expense" : "Add Expense"}</h2>
        <form onSubmit={handleExpenseSubmit} className="grid expense-grid">
          <label>
            Title
            <input name="title" value={expenseForm.title} onChange={onExpenseChange} required />
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="amount"
              value={expenseForm.amount}
              onChange={onExpenseChange}
              required
            />
          </label>
          <label>
            Category
            <select name="category" value={expenseForm.category} onChange={onExpenseChange}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" name="date" value={expenseForm.date} onChange={onExpenseChange} />
          </label>
          <label className="full">
            Note
            <textarea
              rows="3"
              name="note"
              value={expenseForm.note}
              onChange={onExpenseChange}
              placeholder="Optional note"
            />
          </label>
          <div className="actions full">
            <button type="submit" disabled={loading}>
              {editingId ? "Update Expense" : "Add Expense"}
            </button>
            {editingId && (
              <button className="secondary" type="button" onClick={clearEditor}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Filters</h2>
        <form className="grid filter-grid" onSubmit={applyFilters}>
          <label>
            Category
            <select
              value={filters.category}
              onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
            >
              <option value="">All</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start Date
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
            />
          </label>
          <label>
            End Date
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))}
            />
          </label>
          <div className="actions">
            <button type="submit">Apply</button>
            <button className="secondary" type="button" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Expenses</h2>
        {loading && <p className="hint">Loading...</p>}
        {!loading && !expenses.length && <p className="hint">No expenses yet.</p>}
        <div className="list">
          {expenses.map((expense) => (
            <article key={expense._id} className="expense-row">
              <div>
                <h3>{expense.title}</h3>
                <p>
                  {expense.category} • {new Date(expense.date).toLocaleDateString()}
                </p>
                {expense.note && <p className="note">{expense.note}</p>}
              </div>
              <div className="row-right">
                <strong>₹ {Number(expense.amount).toFixed(2)}</strong>
                <div className="mini-actions">
                  <button className="secondary" type="button" onClick={() => startEdit(expense)}>
                    Edit
                  </button>
                  <button
                    className="danger"
                    type="button"
                    onClick={() => handleDelete(expense._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {error && <p className="flash flash-error">{error}</p>}
      {message && <p className="flash flash-ok">{message}</p>}
    </main>
  );
}

export default App;
