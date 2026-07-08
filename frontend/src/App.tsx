import { useEffect } from 'react';
import { io } from 'socket.io-client';
import AdminPanel from './components/AdminPanel';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const fetchLayers = useAppStore((s) => s.fetchLayers);
  const fetchStats = useAppStore((s) => s.fetchStats);
  const refreshLayerData = useAppStore((s) => s.refreshLayerData);
  const adminOpen = useAppStore((s) => s.adminOpen);
  const setAdminOpen = useAppStore((s) => s.setAdminOpen);
  const user = useAppStore((s) => s.user);
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);

  useEffect(() => {
    fetchLayers().catch((e) => setError((e as Error).message));
    fetchStats();

    // Real-time: refresh map data when any client changes locations.
    const socket = io('/', { transports: ['websocket', 'polling'] });
    const refresh = () => {
      void refreshLayerData();
      void fetchStats();
    };
    socket.on('location:created', refresh);
    socket.on('location:updated', refresh);
    socket.on('location:deleted', refresh);
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapView />

      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 h-12 bg-panel/95 backdrop-blur border-b border-edge">
        <div className="flex items-baseline gap-3">
          <span className="text-sand font-semibold tracking-wide">ISMS</span>
          <span className="text-sm text-paper hidden sm:inline">
            Iraq Smart Mapping System
          </span>
          <span className="text-sm text-mist" dir="rtl">
            نظام الخرائط الذكي العراقي
          </span>
        </div>
        <button
          onClick={() => setAdminOpen(!adminOpen)}
          className={`rounded-lg border px-3 py-1.5 text-xs ${
            adminOpen
              ? 'border-sand bg-sand/10 text-sand'
              : 'border-edge text-paper hover:border-mist'
          }`}
        >
          {user ? `Admin (${user.username})` : 'Admin'}
        </button>
      </header>

      <Sidebar />
      {adminOpen && <AdminPanel />}

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 rounded-lg border border-danger bg-panel px-4 py-2 text-sm text-danger shadow-xl">
          {error}
        </div>
      )}
    </div>
  );
}
