(function () {
  const config = window.CCEMS_SUPABASE_LOCAL;
  const sessionKey = "ccems_supabase_local_session";

  function configured() {
    return Boolean(config?.url && config?.publishableKey);
  }

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(sessionKey) || localStorage.getItem(sessionKey) || "null");
    } catch {
      return null;
    }
  }

  function storeSession(session) {
    localStorage.removeItem(sessionKey);
    sessionStorage.removeItem(sessionKey);
    if (session) {
      const storage = session.remember ? localStorage : sessionStorage;
      storage.setItem(sessionKey, JSON.stringify(session));
    }
  }

  async function request(path, options = {}) {
    if (!configured()) throw new Error("Local Supabase is not configured.");
    const session = readSession();
    const headers = new Headers(options.headers || {});
    headers.set("apikey", config.publishableKey);
    if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(`${config.url}${path}`, { ...options, headers });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.msg || body?.message || body?.error_description || "Supabase request failed.");
    return body;
  }

  async function signIn(email, password, remember) {
    const session = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    storeSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: session.user,
      remember: Boolean(remember)
    });
    return session.user;
  }

  async function currentEmployee(userId) {
    const query = new URLSearchParams({
      select: "id,employee_number,preferred_name,employment_status",
      auth_user_id: `eq.${userId}`,
      limit: "1"
    });
    const rows = await request(`/rest/v1/employees?${query}`);
    if (!rows?.length) throw new Error("This account is not assigned to an active CCEMS employee.");
    if (rows[0].employment_status !== "active") throw new Error("This CCEMS employee account is not active.");
    return rows[0];
  }

  async function rpc(functionName, parameters) {
    return request(`/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
      method: "POST",
      body: JSON.stringify(parameters || {})
    });
  }

  async function select(tableName, parameters = {}) {
    const query = parameters instanceof URLSearchParams
      ? parameters
      : new URLSearchParams(parameters);
    return request(`/rest/v1/${encodeURIComponent(tableName)}?${query}`);
  }

  async function insert(tableName, payload) {
    return request(`/rest/v1/${encodeURIComponent(tableName)}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
  }

  async function health() {
    if (!configured()) return false;
    try {
      const response = await fetch(`${config.url}/auth/v1/health`, { headers: { apikey: config.publishableKey } });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function signOut() {
    try {
      if (readSession()?.access_token) await request("/auth/v1/logout", { method: "POST" });
    } finally {
      storeSession(null);
    }
  }

  window.CCEMSSupabase = { configured, readSession, signIn, currentEmployee, select, insert, rpc, health, signOut };
})();
