import { create } from 'zustand';
import { api, setToken } from '../api/client';
import type {
  Feature,
  FeatureCollection,
  LayerMeta,
  Stats,
  User,
} from '../types';

type QueryMode = 'none' | 'nearby' | 'nearest-hospital' | 'pick';

interface AppState {
  // auth
  token: string | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;

  // layers & data
  layers: LayerMeta[];
  layerData: Record<string, FeatureCollection>;
  visible: Record<string, boolean>;
  fetchLayers: () => Promise<void>;
  refreshLayerData: () => Promise<void>;
  toggleLayer: (type: string) => void;

  // spatial query tools
  queryMode: QueryMode;
  setQueryMode: (m: QueryMode) => void;
  queryOrigin: [number, number] | null; // [lng, lat]
  radius: number;
  setRadius: (r: number) => void;
  nearbyResults: FeatureCollection | null;
  nearestResult: Feature | null;
  runQueryAt: (lng: number, lat: number) => Promise<void>;
  clearQuery: () => void;

  // admin pick-on-map
  pickedPoint: [number, number] | null; // [lng, lat]
  setPickedPoint: (p: [number, number] | null) => void;

  // stats & ui
  stats: Stats | null;
  fetchStats: () => Promise<void>;
  adminOpen: boolean;
  setAdminOpen: (open: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  token: null,
  user: null,

  async login(username, password) {
    const res = await api.login(username, password);
    setToken(res.access_token);
    set({ token: res.access_token, user: res.user });
  },

  logout() {
    setToken(null);
    set({ token: null, user: null });
  },

  layers: [],
  layerData: {},
  visible: {},

  async fetchLayers() {
    const layers = await api.layers();
    const visible = { ...get().visible };
    for (const l of layers) {
      if (visible[l.type] === undefined) visible[l.type] = true;
    }
    set({ layers, visible });
    await get().refreshLayerData();
  },

  async refreshLayerData() {
    const { layers } = get();
    const entries = await Promise.all(
      layers.map(async (l) => [l.type, await api.layerFeatures(l.type)] as const),
    );
    set({ layerData: Object.fromEntries(entries) });
  },

  toggleLayer(type) {
    set((s) => ({ visible: { ...s.visible, [type]: !s.visible[type] } }));
  },

  queryMode: 'none',
  setQueryMode(m) {
    set({ queryMode: m });
    if (m === 'none') get().clearQuery();
  },
  queryOrigin: null,
  radius: 25_000,
  setRadius(r) {
    set({ radius: r });
  },
  nearbyResults: null,
  nearestResult: null,

  async runQueryAt(lng, lat) {
    const { queryMode, radius, setError } = get();
    try {
      if (queryMode === 'nearby') {
        const fc = await api.nearby(lat, lng, radius);
        set({ queryOrigin: [lng, lat], nearbyResults: fc, nearestResult: null });
      } else if (queryMode === 'nearest-hospital') {
        const f = await api.nearestHospital(lat, lng);
        set({ queryOrigin: [lng, lat], nearestResult: f, nearbyResults: null });
      } else if (queryMode === 'pick') {
        set({ pickedPoint: [lng, lat] });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  },

  clearQuery() {
    set({ queryOrigin: null, nearbyResults: null, nearestResult: null });
  },

  pickedPoint: null,
  setPickedPoint(p) {
    set({ pickedPoint: p });
  },

  stats: null,
  async fetchStats() {
    try {
      set({ stats: await api.stats() });
    } catch {
      /* non-fatal */
    }
  },

  adminOpen: false,
  setAdminOpen(open) {
    set({ adminOpen: open, queryMode: open ? 'pick' : 'none' });
  },

  error: null,
  setError(e) {
    set({ error: e });
    if (e) setTimeout(() => set({ error: null }), 5000);
  },
}));
