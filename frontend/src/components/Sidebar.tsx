import { useAppStore } from '../store/useAppStore';

export default function Sidebar() {
  const layers = useAppStore((s) => s.layers);
  const visible = useAppStore((s) => s.visible);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const queryMode = useAppStore((s) => s.queryMode);
  const setQueryMode = useAppStore((s) => s.setQueryMode);
  const radius = useAppStore((s) => s.radius);
  const setRadius = useAppStore((s) => s.setRadius);
  const nearbyResults = useAppStore((s) => s.nearbyResults);
  const nearestResult = useAppStore((s) => s.nearestResult);
  const stats = useAppStore((s) => s.stats);
  const adminOpen = useAppStore((s) => s.adminOpen);

  return (
    <aside className="absolute top-16 left-3 z-10 w-72 max-h-[calc(100%-5rem)] overflow-y-auto rounded-xl border border-edge bg-panel/95 backdrop-blur shadow-2xl">
      {/* Layers */}
      <section className="p-4 border-b border-edge">
        <h2 className="text-xs uppercase tracking-widest text-mist mb-3">
          Layers · الطبقات
        </h2>
        <ul className="space-y-2">
          {layers.map((l) => (
            <li key={l.type}>
              <button
                onClick={() => toggleLayer(l.type)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  visible[l.type]
                    ? 'bg-night border border-edge'
                    : 'opacity-40 hover:opacity-70'
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: l.color }}
                />
                <span className="flex-1">
                  <span className="block text-sm">{l.name}</span>
                  <span className="block text-xs text-mist" dir="rtl">
                    {l.nameAr}
                  </span>
                </span>
                <span className="text-xs text-mist font-mono">
                  {l.featureCount}
                </span>
              </button>
            </li>
          ))}
          {layers.length === 0 && (
            <li className="text-sm text-mist">Loading layers…</li>
          )}
        </ul>
      </section>

      {/* Spatial tools */}
      {!adminOpen && (
        <section className="p-4 border-b border-edge">
          <h2 className="text-xs uppercase tracking-widest text-mist mb-3">
            Spatial tools · أدوات مكانية
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                setQueryMode(queryMode === 'nearby' ? 'none' : 'nearby')
              }
              className={`rounded-lg border px-2 py-2 text-xs ${
                queryMode === 'nearby'
                  ? 'border-sand bg-sand/10 text-sand'
                  : 'border-edge text-paper hover:border-mist'
              }`}
            >
              Within radius
            </button>
            <button
              onClick={() =>
                setQueryMode(
                  queryMode === 'nearest-hospital' ? 'none' : 'nearest-hospital',
                )
              }
              className={`rounded-lg border px-2 py-2 text-xs ${
                queryMode === 'nearest-hospital'
                  ? 'border-danger bg-danger/10 text-danger'
                  : 'border-edge text-paper hover:border-mist'
              }`}
            >
              Nearest hospital
            </button>
          </div>

          {queryMode === 'nearby' && (
            <div className="mt-3">
              <label className="flex items-center justify-between text-xs text-mist">
                Radius
                <span className="font-mono text-paper">
                  {(radius / 1000).toFixed(0)} km
                </span>
              </label>
              <input
                type="range"
                min={1000}
                max={300000}
                step={1000}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-[#e8b64c]"
              />
            </div>
          )}

          {queryMode !== 'none' && (
            <p className="mt-2 text-xs text-mist">
              Click anywhere on the map to run the query.
            </p>
          )}

          {nearbyResults && (
            <div className="mt-3 rounded-lg bg-night border border-edge p-3">
              <p className="text-xs text-sand mb-2">
                {nearbyResults.features.length} feature
                {nearbyResults.features.length === 1 ? '' : 's'} in range
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {nearbyResults.features.map((f) => (
                  <li
                    key={f.id}
                    className="flex justify-between gap-2 text-xs"
                  >
                    <span className="truncate">{f.properties.name}</span>
                    <span className="text-mist font-mono shrink-0">
                      {((f.properties.distance_m ?? 0) / 1000).toFixed(1)} km
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {nearestResult && (
            <div className="mt-3 rounded-lg bg-night border border-danger/40 p-3">
              <p className="text-xs uppercase tracking-widest text-danger mb-1">
                Nearest hospital
              </p>
              <p className="text-sm">{nearestResult.properties.name}</p>
              {nearestResult.properties.name_ar && (
                <p className="text-xs text-mist" dir="rtl">
                  {nearestResult.properties.name_ar}
                </p>
              )}
              <p className="text-xs text-mist font-mono mt-1">
                {((nearestResult.properties.distance_m ?? 0) / 1000).toFixed(2)}{' '}
                km away
              </p>
            </div>
          )}
        </section>
      )}

      {/* Stats */}
      {stats && (
        <section className="p-4">
          <h2 className="text-xs uppercase tracking-widest text-mist mb-3">
            System · النظام
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-night border border-edge py-2">
              <div className="text-lg font-semibold text-sand">
                {stats.totalLocations}
              </div>
              <div className="text-[10px] text-mist uppercase">Features</div>
            </div>
            <div className="rounded-lg bg-night border border-edge py-2">
              <div className="text-lg font-semibold text-sand">
                {stats.totalLayers}
              </div>
              <div className="text-[10px] text-mist uppercase">Layers</div>
            </div>
            <div className="rounded-lg bg-night border border-edge py-2">
              <div className="text-lg font-semibold text-sand">
                {stats.totalUsers}
              </div>
              <div className="text-[10px] text-mist uppercase">Users</div>
            </div>
          </div>
        </section>
      )}
    </aside>
  );
}
