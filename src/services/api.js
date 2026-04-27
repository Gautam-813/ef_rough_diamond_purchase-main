const API_URL = ""; // Dynamic: Uses current domain for production

const getHeaders = () => {
  const token = localStorage.getItem("ef_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // --- Auth ---
  login: async (email, password) => {
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.access_token) localStorage.setItem("ef_token", data.access_token);
    return data;
  },

  signup: async (email, password, role = "user") => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password, role }),
    });
    return res.json();
  },

  getMe: async () => {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    return res.json();
  },

  // --- Tenders & Parcels ---
  getTenders: async () => {
    const res = await fetch(`${API_URL}/tenders`, { headers: getHeaders() });
    return res.json();
  },

  createTender: async (tender) => {
    const res = await fetch(`${API_URL}/tenders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(tender),
    });
    return res.json();
  },

  updateTender: async (id, data) => {
    const res = await fetch(`${API_URL}/tenders/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  createParcel: async (tenderId, parcel) => {
    const res = await fetch(`${API_URL}/tenders/${tenderId}/parcels`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(parcel),
    });
    return res.json();
  },

  updateParcel: async (id, data) => {
    const res = await fetch(`${API_URL}/parcels/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  shareTender: async (tenderId, email) => {
    const res = await fetch(`${API_URL}/tenders/${tenderId}/share?email=${encodeURIComponent(email)}`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },

  // --- Media ---
  uploadFile: async (parcelId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/parcels/${parcelId}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("ef_token")}`,
      },
      body: formData,
    });
    return res.json();
  },

  deleteMedia: async (mediaId) => {
    const res = await fetch(`${API_URL}/media/${mediaId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  deleteTender: async (id) => {
    const res = await fetch(`${API_URL}/tenders/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  deleteParcel: async (id) => {
    const res = await fetch(`${API_URL}/parcels/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  // --- Admin User Management ---
  listUsers: async () => {
    const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },

  updateUserRole: async (userId, role) => {
    const res = await fetch(`${API_URL}/admin/users/${userId}/role?role=${role}`, {
      method: "PUT",
      headers: getHeaders(),
    });
    return res.json();
  },

  deleteUser: async (userId) => {
    const res = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  resetUserPassword: async (userId, password) => {
    const res = await fetch(`${API_URL}/admin/users/${userId}/password`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ password }),
    });
    return res.json();
  },

  getMyConfig: async () => {
    const res = await fetch(`${API_URL}/config/me`, { headers: getHeaders() });
    return res.json();
  },

  updateMyConfig: async (data) => {
    const res = await fetch(`${API_URL}/config/me`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }
};
