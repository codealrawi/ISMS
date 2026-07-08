export interface User {
  id: number;
  username: string;
  role: 'admin' | 'government_user' | 'viewer';
}

export interface LayerMeta {
  id: number;
  type: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  color: string;
  geometry: 'POINT' | 'LINESTRING';
  featureCount: number;
}

export interface Feature {
  type: 'Feature';
  id: number;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown> & {
    id: number;
    name: string;
    name_ar?: string | null;
    layer_type?: string | null;
    distance_m?: number;
  };
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

export interface Stats {
  totalLocations: number;
  totalLayers: number;
  totalUsers: number;
  byLayer: { type: string; name: string; count: number }[];
  generatedAt: string;
}
