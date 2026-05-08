const API_URL = ""; // Dynamic: Uses current domain for production

const getHeaders = () => {
  const token = localStorage.getItem("ef_token");
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const apiFetch = async (url, options = {}) => {
  // Add timestamp to GET requests to prevent caching
  if (!options.method || options.method === "GET") {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}_t=${Date.now()}`;
  }

  const res = await fetch(url, options);
  if (res.status === 401) {
    // Token expired or invalid - clear localStorage and throw specific error
    localStorage.removeItem("ef_token");
    window.location.href = "/";
    throw new Error("SESSION_EXPIRED");
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
};

export const api = {
  // --- Auth ---
  login: async (email, password) => {
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);

    const data = await apiFetch(`${API_URL}/auth/login`, {
      method: "POST",
      body: formData,
    });
    if (data.access_token) localStorage.setItem("ef_token", data.access_token);
    return data;
  },

  signup: async (email, password, role = "user") => {
    return apiFetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password, role }),
    });
  },

  getMe: async () => {
    return apiFetch(`${API_URL}/auth/me`, { headers: getHeaders() });
  },

  // --- Tenders & Parcels ---
  getTenders: async () => {
    return apiFetch(`${API_URL}/tenders`, { headers: getHeaders() });
  },

  createTender: async (tender) => {
    return apiFetch(`${API_URL}/tenders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(tender),
    });
  },

  updateTender: async (id, data) => {
    return apiFetch(`${API_URL}/tenders/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  createParcel: async (tenderId, parcel) => {
    return apiFetch(`${API_URL}/tenders/${tenderId}/parcels`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(parcel),
    });
  },

  updateParcel: async (id, data) => {
    return apiFetch(`${API_URL}/parcels/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  shareTender: async (tenderId, email) => {
    return apiFetch(`${API_URL}/tenders/${tenderId}/share?email=${encodeURIComponent(email)}`, {
      method: "POST",
      headers: getHeaders(),
    });
  },

  // --- Media ---
  uploadFile: async (parcelId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch(`${API_URL}/parcels/${parcelId}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("ef_token")}`,
      },
      body: formData,
    });
  },

  deleteMedia: async (mediaId) => {
    return apiFetch(`${API_URL}/media/${mediaId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  deleteTender: async (id) => {
    return apiFetch(`${API_URL}/tenders/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  deleteParcel: async (id) => {
    return apiFetch(`${API_URL}/parcels/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  // --- Admin User Management ---
  listUsers: async () => {
    return apiFetch(`${API_URL}/admin/users`, { headers: getHeaders() });
  },

  updateUserRole: async (userId, role) => {
    return apiFetch(`${API_URL}/admin/users/${userId}/role?role=${role}`, {
      method: "PUT",
      headers: getHeaders(),
    });
  },

  deleteUser: async (userId) => {
    return apiFetch(`${API_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  resetUserPassword: async (userId, password) => {
    return apiFetch(`${API_URL}/admin/users/${userId}/password`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ password }),
    });
  },

  getMyConfig: async () => {
    return apiFetch(`${API_URL}/config/me`, { headers: getHeaders() });
  },

  updateMyConfig: async (data) => {
    return apiFetch(`${API_URL}/config/me`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },
  
  syncPricesFromExcel: async (formData) => {
    return apiFetch(`${API_URL}/config/sync-excel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("ef_token")}`,
      },
      body: formData,
    });
  }
};
