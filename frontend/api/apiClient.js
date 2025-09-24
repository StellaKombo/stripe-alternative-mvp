const API_BASE = "https://your-deno-backend.com/api/v1";

export const api = {
  postMerchant: async (data) => {
    const res = await fetch(`${API_BASE}/merchants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  postDocument: async (merchantId, data) => {
    const res = await fetch(`${API_BASE}/merchants/${merchantId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getRiskProfile: async (merchantId) => {
    const res = await fetch(`${API_BASE}/risk/${merchantId}`);
    return res.json();
  },
};
