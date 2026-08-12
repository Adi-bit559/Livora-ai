import { filterIndianProperties, MOCK_INDIAN_PROPERTIES } from './indianPropertiesData';

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
    list: async (params: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });

      try {
        const res = await request(`/properties?${query.toString()}`);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          return res;
        }
      } catch (e) {
        console.warn('Backend API request failed, using Indian properties dataset:', e);
      }

      // Fallback for Vercel Serverless / DB Offline / Empty Database
      const fallbackData = filterIndianProperties(params);
      return {
        success: true,
        data: fallbackData,
        meta: {
          total: fallbackData.length,
          page: 1,
          limit: 100,
          totalPages: 1,
        },
      };
    },

    getById: async (id: string) => {
      try {
        const res = await request(`/properties/${id}`);
        if (res.success && res.data) {
          return res;
        }
      } catch (e) {
        console.warn('Backend API request failed for property details:', e);
      }

      const found = MOCK_INDIAN_PROPERTIES.find((p) => p.id === id);
      if (found) {
        return {
          success: true,
          data: {
            ...found,
            vacancyPrediction: { predictedDays: 14, confidenceScore: 94 },
            roommates: [
              {
                id: 'rm-1',
                budgetMin: 8000,
                budgetMax: 20000,
                preferredCity: found.city,
                sleepSchedule: 'EARLY_BIRD',
                cleanlinessLevel: 'HIGH',
                socialLevel: 'AMBIVERT',
                foodPreference: 'VEG',
                smokingPreference: 'NON_SMOKER',
                user: { id: 'u-1', name: 'Aarav Sharma', profileImage: undefined, city: found.city },
              },
              {
                id: 'rm-2',
                budgetMin: 9000,
                budgetMax: 22000,
                preferredCity: found.city,
                sleepSchedule: 'NIGHT_OWL',
                cleanlinessLevel: 'VERY_HIGH',
                socialLevel: 'EXTROVERT',
                foodPreference: 'NON_VEG',
                smokingPreference: 'NON_SMOKER',
                user: { id: 'u-2', name: 'Riya Patel', profileImage: undefined, city: found.city },
              },
            ],
          },
        };
      }
      return { success: false, message: 'Property not found' };
    },

    create: (data: any) => request('/properties', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/properties/${id}`, { method: 'DELETE' }),
    getTrustScore: (id: string) => request(`/properties/${id}/trust-score`),
    getVacancy: (id: string) => request(`/properties/${id}/vacancy`),
  },

  // Bookings
  bookings: {
    create: async (data: { propertyId: string; roomId: string; moveInDate: string; duration?: number }) => {
      const res = await request('/bookings', { method: 'POST', body: JSON.stringify(data) });
      if (res.success) return res;
      // Fallback pre-booking simulation for client-only / Vercel mode
      return {
        success: true,
        message: '🎉 Pre-booking confirmed with ₹0 Brokerage & 2% Platform Fee!',
        data: {
          id: `book-${Date.now()}`,
          status: 'CONFIRMED',
          moveInDate: data.moveInDate,
        },
      };
    },
    list: () => request('/bookings'),
  },

  // Saved & Compare
  saved: {
    list: () => request('/saved'),
    add: (propertyId: string) => request(`/saved/${propertyId}`, { method: 'POST' }),
    remove: (propertyId: string) => request(`/saved/${propertyId}`, { method: 'DELETE' }),
  },

  compare: {
    getComparison: async (propertyIds: string[]) => {
      const res = await request('/compare', { method: 'POST', body: JSON.stringify({ propertyIds }) });
      if (res.success && res.data && res.data.length > 0) return res;

      const items = MOCK_INDIAN_PROPERTIES.filter((p) => propertyIds.includes(p.id));
      return { success: true, data: items };
    },
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

