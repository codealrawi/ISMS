import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import type { Feature } from '../types';

function LoginForm() {
  const login = useAppStore((s) => s.login);
  const setError = useAppStore((s) => s.setError);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 space-y-3">
      <p className="text-xs text-mist">
        Sign in to manage locations. Seeded accounts:{' '}
        <code className="font-mono text-paper">admin/admin123</code>,{' '}
        <code className="font-mono text-paper">gov/gov123</code>,{' '}
        <code className="font-mono text-paper">viewer/viewer123</code>
      </p>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        className="w-full rounded-lg bg-night border border-edge px-3 py-2 text-sm outline-none focus:border-sand"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-lg bg-night border border-edge px-3 py-2 text-sm outline-none focus:border-sand"
      />
      <button
        disabled={busy}
        className="w-full rounded-lg bg-sand text-night font-semibold py-2 text-sm hover:brightness-110 disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default function AdminPanel() {
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const layers = useAppStore((s) => s.layers);
  const setAdminOpen = useAppStore((s) => s.setAdminOpen);
  const pickedPoint = useAppStore((s) => s.pickedPoint);
  const setPickedPoint = useAppStore((s) => s.setPickedPoint);
  const refreshLayerData = useAppStore((s) => s.refreshLayerData);
  const fetchLayers = useAppStore((s) => s.fetchLayers);
  const fetchStats = useAppStore((s) => s.fetchStats);
  const setError = useAppStore((s) => s.setError);

  const [features, setFeatures] = useState<Feature[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [layerId, setLayerId] = useState<number | ''>('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [busy, setBusy] = useState(false);

  const canWrite = user?.role === 'admin' || user?.role === 'government_user';
  const canDelete = user?.role === 'admin';

  async function loadFeatures() {
    try {
      const fc = await api.locations();
      setFeatures(
        fc.features.filter((f) => f.geometry.type === 'Point'),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (user) void loadFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // map click in pick mode fills the coordinate inputs
  useEffect(() => {
    if (pickedPoint) {
      setLng(pickedPoint[0].toFixed(5));
      setLat(pickedPoint[1].toFixed(5));
    }
  }, [pickedPoint]);

  function resetForm() {
    setEditingId(null);
    setName('');
    setNameAr('');
    setLayerId('');
    setLat('');
    setLng('');
    setPickedPoint(null);
  }

  function startEdit(f: Feature) {
    setEditingId(f.id);
    setName(f.properties.name);
    setNameAr((f.properties.name_ar as string) ?? '');
    const layer = layers.find((l) => l.type === f.properties.layer_type);
    setLayerId(layer?.id ?? '');
    const coords = f.geometry.coordinates as [number, number];
    setLng(String(coords[0]));
    setLat(String(coords[1]));
  }

  async function afterMutation() {
    await Promise.all([loadFeatures(), refreshLayerData(), fetchLayers(), fetchStats()]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || layerId === '' || lat === '' || lng === '') {
      setError('Name, layer, latitude and longitude are required');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name,
        nameAr: nameAr || undefined,
        layerId: Number(layerId),
        geometryType: 'POINT' as const,
        coordinates: [{ lat: Number(lat), lng: Number(lng) }],
      };
      if (editingId === null) {
        await api.createLocation(payload);
      } else {
        await api.updateLocation(editingId, payload);
      }
      resetForm();
      await afterMutation();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    setBusy(true);
    try {
      await api.deleteLocation(id);
      if (editingId === id) resetForm();
      await afterMutation();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="absolute top-16 right-3 z-10 w-80 max-h-[calc(100%-5rem)] overflow-y-auto rounded-xl border border-edge bg-panel/95 backdrop-blur shadow-2xl">
      <header className="flex items-center justify-between px-4 py-3 border-b border-edge">
        <h2 className="text-xs uppercase tracking-widest text-mist">
          Administration · الإدارة
        </h2>
        <button
          onClick={() => setAdminOpen(false)}
          className="text-mist hover:text-paper text-lg leading-none"
          aria-label="Close admin panel"
        >
          ×
        </button>
      </header>

      {!user && <LoginForm />}

      {user && (
        <div>
          <div className="flex items-center justify-between px-4 py-2 border-b border-edge text-xs">
            <span>
              <span className="text-paper">{user.username}</span>{' '}
              <span className="text-sand">({user.role})</span>
            </span>
            <button onClick={logout} className="text-mist hover:text-danger">
              Sign out
            </button>
          </div>

          {canWrite ? (
            <form onSubmit={onSubmit} className="p-4 space-y-2 border-b border-edge">
              <p className="text-xs text-mist">
                {editingId === null ? 'Add a location' : `Editing #${editingId}`} —
                click the map to fill coordinates.
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (English)"
                className="w-full rounded-lg bg-night border border-edge px-3 py-2 text-sm outline-none focus:border-sand"
              />
              <input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="الاسم (عربي)"
                dir="rtl"
                className="w-full rounded-lg bg-night border border-edge px-3 py-2 text-sm outline-none focus:border-sand"
              />
              <select
                value={layerId}
                onChange={(e) =>
                  setLayerId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full rounded-lg bg-night border border-edge px-3 py-2 text-sm outline-none focus:border-sand"
              >
                <option value="">Choose a layer…</option>
                {layers
                  .filter((l) => l.geometry === 'POINT')
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
              <div className="flex gap-2">
                <input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Latitude"
                  className="w-1/2 rounded-lg bg-night border border-edge px-3 py-2 text-sm font-mono outline-none focus:border-sand"
                />
                <input
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="Longitude"
                  className="w-1/2 rounded-lg bg-night border border-edge px-3 py-2 text-sm font-mono outline-none focus:border-sand"
                />
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  className="flex-1 rounded-lg bg-sand text-night font-semibold py-2 text-sm hover:brightness-110 disabled:opacity-50"
                >
                  {editingId === null ? 'Add location' : 'Save changes'}
                </button>
                {editingId !== null && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-edge px-3 text-sm text-mist hover:text-paper"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <p className="p-4 text-xs text-mist border-b border-edge">
              Your role is read-only. Sign in as{' '}
              <code className="font-mono text-paper">admin</code> or{' '}
              <code className="font-mono text-paper">gov</code> to edit data.
            </p>
          )}

          <ul className="p-2 space-y-1">
            {features.map((f) => (
              <li
                key={f.id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                  editingId === f.id ? 'bg-night border border-sand/40' : ''
                }`}
              >
                <span className="flex-1 truncate">
                  {f.properties.name}
                  <span className="text-mist"> · {f.properties.layer_type}</span>
                </span>
                {canWrite && (
                  <button
                    onClick={() => startEdit(f)}
                    className="text-mist hover:text-sand"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(f.id)}
                    disabled={busy}
                    className="text-mist hover:text-danger disabled:opacity-40"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
            {features.length === 0 && (
              <li className="px-2 py-1.5 text-xs text-mist">
                No point locations yet.
              </li>
            )}
          </ul>
        </div>
      )}
    </aside>
  );
}
