const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sessionStorageKey = "gymTrackerSupabaseSession";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

function getSession() {
  const stored = localStorage.getItem(sessionStorageKey);
  return stored ? JSON.parse(stored) : null;
}

function saveSession(session) {
  if (session) {
    localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  } else {
    localStorage.removeItem(sessionStorageKey);
  }
}

async function request(path, options = {}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add the two VITE_SUPABASE values first.");
  }

  const session = getSession();
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const responseText = response.status === 204 ? "" : await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error_description ||
        data?.msg ||
        data?.error ||
        data?.code ||
        `Supabase request failed (HTTP ${response.status}).`
    );
  }

  return data;
}

export const auth = {
  getSession,
  clearSession() {
    saveSession(null);
  },
  async signIn(email, password) {
    const session = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email, password },
    });
    saveSession(session);
    return session;
  },
  async signUp(email, password, displayName) {
    return request("/auth/v1/signup", {
      method: "POST",
      body: { email, password, data: { display_name: displayName } },
    });
  },
  async signOut() {
    try {
      await request("/auth/v1/logout", { method: "POST" });
    } finally {
      saveSession(null);
    }
  },
  async updateDisplayName(displayName) {
    const user = await request("/auth/v1/user", {
      method: "PUT",
      body: { data: { display_name: displayName } },
    });
    const session = getSession();
    const updatedSession = { ...session, user };
    saveSession(updatedSession);
    return updatedSession;
  },
};

export const db = {
  select(table, query = "") {
    return request(`/rest/v1/${table}?select=*${query}`);
  },
  insert(table, row) {
    return request(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: row,
    });
  },
  update(table, id, row) {
    return request(`/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: row,
    });
  },
  upsert(table, row, conflictColumns) {
    return request(`/rest/v1/${table}?on_conflict=${conflictColumns}`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: row,
    });
  },
  remove(table, id) {
    return request(`/rest/v1/${table}?id=eq.${id}`, { method: "DELETE" });
  },
  rpc(functionName, body) {
    return request(`/rest/v1/rpc/${functionName}`, { method: "POST", body });
  },
};
