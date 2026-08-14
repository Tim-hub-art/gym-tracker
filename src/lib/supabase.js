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
  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error(data?.message || data?.error_description || "Supabase request failed.");
  }

  return data;
}

export const auth = {
  getSession,
  async signIn(email, password) {
    const session = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email, password },
    });
    saveSession(session);
    return session;
  },
  async signUp(email, password) {
    return request("/auth/v1/signup", {
      method: "POST",
      body: { email, password },
    });
  },
  async signOut() {
    try {
      await request("/auth/v1/logout", { method: "POST" });
    } finally {
      saveSession(null);
    }
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
};
