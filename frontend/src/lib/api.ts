const API_BASE = '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('livora_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('livora_token', token);
  } else {
    localStorage.removeItem('livora_token');
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; meta?: any; message?: string }> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.message || 'API Error' };
    }
    return json;
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error occurred' };
  }
}

export const api = {
  // Auth
  auth: {
    login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me'),
  },

  // Properties & Search
  properties: {
    list: (params: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
      return request(`/properties?${query.toString()}`);
    },
    getById: (id: string) => request(`/properties/${id}`),
    create: (data: any) => request('/properties', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/properties/${id}`, { method: 'DELETE' }),
    getTrustScore: (id: string) => request(`/properties/${id}/trust-score`),
    getVacancy: (id: string) => request(`/properties/${id}/vacancy`),
  },

  // Bookings
  bookings: {
    create: (data: { propertyId: string; roomId: string; moveInDate: string; duration?: number }) =>
      request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    list: () => request('/bookings'),
  },

  // Saved & Compare
  saved: {
    list: () => request('/saved'),
    add: (propertyId: string) => request(`/saved/${propertyId}`, { method: 'POST' }),
    remove: (propertyId: string) => request(`/saved/${propertyId}`, { method: 'DELETE' }),
  },
  compare: {
    getComparison: (propertyIds: string[]) => request('/compare', { method: 'POST', body: JSON.stringify({ propertyIds }) }),
  },

  // Reviews
  reviews: {
    submit: (data: any) => request('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Roommates & AI
  roommates: {
    list: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/roommates?${query}`);
    },
    getMatches: () => request('/roommates/matches'),
    getRecommendations: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/recommendations?${query}`);
    },
  },

  // Owner & Subscriptions
  owner: {
    getProperties: () => request('/owner/properties'),
    getAnalytics: () => request('/owner/analytics'),
    getSubscription: () => request('/owner/subscription'),
    subscribe: (plan: 'BASIC' | 'PRO') => request('/owner/subscription/subscribe', { method: 'POST', body: JSON.stringify({ plan }) }),
    cancelAutoRenew: () => request('/owner/subscription/cancel-auto-renew', { method: 'POST' }),
    addRoom: (propertyId: string, roomData: any) => request(`/owner/properties/${propertyId}/rooms`, { method: 'POST', body: JSON.stringify(roomData) }),
  },

  // Admin
  admin: {
    getVerifications: () => request('/admin/verifications'),
    verifyProperty: (id: string) => request(`/admin/properties/${id}/verify`, { method: 'PATCH' }),
    rejectProperty: (id: string) => request(`/admin/properties/${id}/reject`, { method: 'PATCH' }),
    getRevenue: () => request('/admin/revenue'),
  },

  // Dashboards
  dashboard: {
    getRenter: () => request('/dashboard/renter'),
    getOwner: () => request('/dashboard/owner'),
  },

  // Messaging & Notifications
  messages: {
    list: () => request('/messages'),
    send: (receiverId: string, content: string, propertyId?: string) =>
      request('/messages', { method: 'POST', body: JSON.stringify({ receiverId, content, propertyId }) }),
  },
  notifications: {
    list: () => request('/notifications'),
  },
};
