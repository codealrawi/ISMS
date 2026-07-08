import type {
  Feature,
  FeatureCollection,
  LayerMeta,
  Stats,
  User,
} from '../types';

const BASE = '/api';

let authToken: string | null = null;
export function setToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  layers: () => request<LayerMeta[]>('/layers'),

  layerFeatures: (type: string) =>
    request<FeatureCollection>(`/layers/${encodeURIComponent(type)}`),

  locations: () => request<FeatureCollection>('/locations'),

  createLocation: (payload: {
    name: string;
    nameAr?: string;
    layerId: number;
    geometryType: 'POINT' | 'LINESTRING';
    coordinates: { lat: number; lng: number }[];
    properties?: Record<string, unknown>;
  }) =>
    request<Feature>('/locations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateLocation: (
    id: number,
    payload: Partial<{
      name: string;
      nameAr: string;
      layerId: number;
      geometryType: 'POINT' | 'LINESTRING';
      coordinates: { lat: number; lng: number }[];
      properties: Record<string, unknown>;
    }>,
  ) =>
    request<Feature>(`/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteLocation: (id: number) =>
    request<{ deleted: true; id: number }>(`/locations/${id}`, {
      method: 'DELETE',
    }),

  nearby: (lat: number, lng: number, radius: number, layer?: string) =>
    request<FeatureCollection>(
      `/spatial/nearby?lat=${lat}&lng=${lng}&radius=${radius}${
        layer ? `&layer=${encodeURIComponent(layer)}` : ''
      }`,
    ),

  nearestHospital: (lat: number, lng: number) =>
    request<Feature>(`/spatial/nearest-hospital?lat=${lat}&lng=${lng}`),

  stats: () => request<Stats>('/stats'),
};
