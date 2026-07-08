import maplibregl, { Map as MLMap, MapMouseEvent } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Feature } from '../types';

const IRAQ_CENTER: [number, number] = [43.9, 33.2];
const IRAQ_BOUNDS: [[number, number], [number, number]] = [
  [38.5, 28.8],
  [49.0, 37.7],
];

const BASE_STYLE = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'osm', type: 'raster' as const, source: 'osm' },
    {
      id: 'osm-dim',
      type: 'background' as const,
      paint: { 'background-color': '#0d1319', 'background-opacity': 0.25 },
    },
  ],
};

const EMPTY_FC = { type: 'FeatureCollection', features: [] } as const;

/** Map layer ids rendered for each GIS layer type. */
function subLayerIds(type: string): string[] {
  if (type === 'hospitals') {
    return ['lyr-hospitals-clusters', 'lyr-hospitals-count', 'lyr-hospitals-point'];
  }
  if (type === 'cities') return ['lyr-cities', 'lyr-cities-label'];
  if (type === 'roads') return ['lyr-roads'];
  return [`lyr-${type}`];
}

function popupHtml(f: Feature): string {
  const p = f.properties;
  const rows: string[] = [];
  if (p.name_ar) {
    rows.push(
      `<div dir="rtl" style="color:#e8b64c;font-size:14px">${p.name_ar}</div>`,
    );
  }
  if (p.layer_type) {
    rows.push(
      `<div style="color:#8a97a3;font-size:11px;text-transform:uppercase;letter-spacing:.08em">${p.layer_type}</div>`,
    );
  }
  if (typeof p.distance_m === 'number') {
    rows.push(
      `<div style="font-size:12px">Distance: <b>${(p.distance_m / 1000).toFixed(2)} km</b></div>`,
    );
  }
  for (const key of ['population', 'beds', 'governorate', 'city', 'ref', 'level']) {
    if (p[key] !== undefined) {
      rows.push(`<div style="font-size:12px;color:#8a97a3">${key}: ${p[key]}</div>`);
    }
  }
  return `<div style="min-width:160px">
    <div style="font-weight:600;font-size:15px">${p.name}</div>
    ${rows.join('')}
  </div>`;
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const layersAddedRef = useRef(false);

  const layers = useAppStore((s) => s.layers);
  const layerData = useAppStore((s) => s.layerData);
  const visible = useAppStore((s) => s.visible);
  const queryMode = useAppStore((s) => s.queryMode);
  const queryOrigin = useAppStore((s) => s.queryOrigin);
  const nearbyResults = useAppStore((s) => s.nearbyResults);
  const nearestResult = useAppStore((s) => s.nearestResult);
  const pickedPoint = useAppStore((s) => s.pickedPoint);

  // --- init map once ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE as never,
      center: IRAQ_CENTER,
      zoom: 5.4,
      minZoom: 4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }));
    map.fitBounds(IRAQ_BOUNDS, { padding: 40, duration: 0 });

    map.on('load', () => setMapLoaded(true));

    map.on('click', (e: MapMouseEvent) => {
      const state = useAppStore.getState();
      if (state.queryMode !== 'none') {
        void state.runQueryAt(e.lngLat.lng, e.lngLat.lat);
        return;
      }
      const hit = map.queryRenderedFeatures(e.point, {
        layers: [
          'lyr-cities',
          'lyr-hospitals-point',
          'lyr-government',
          'lyr-roads',
        ].filter((id) => map.getLayer(id)),
      });
      if (hit.length > 0) {
        const f = {
          type: 'Feature',
          id: Number(hit[0].id ?? 0),
          geometry: hit[0].geometry as never,
          properties: hit[0].properties as never,
        } as Feature;
        new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
          .setLngLat(e.lngLat)
          .setHTML(popupHtml(f))
          .addTo(map);
      }
    });

    // expand clusters on click
    map.on('click', 'lyr-hospitals-clusters', async (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['lyr-hospitals-clusters'],
      });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.getSource('src-hospitals') as maplibregl.GeoJSONSource;
      if (clusterId !== undefined && source) {
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({
          center: (features[0].geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ],
          zoom,
        });
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- add GIS sources/layers once map + metadata are ready ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || layers.length === 0 || layersAddedRef.current) {
      return;
    }
    layersAddedRef.current = true;

    const color = (type: string, fallback: string) =>
      layers.find((l) => l.type === type)?.color ?? fallback;

    // Roads (lines, under points)
    map.addSource('src-roads', { type: 'geojson', data: EMPTY_FC as never });
    map.addLayer({
      id: 'lyr-roads',
      type: 'line',
      source: 'src-roads',
      paint: {
        'line-color': color('roads', '#8a7ff0'),
        'line-width': 3,
        'line-opacity': 0.85,
      },
    });

    // Government buildings
    map.addSource('src-government', { type: 'geojson', data: EMPTY_FC as never });
    map.addLayer({
      id: 'lyr-government',
      type: 'circle',
      source: 'src-government',
      paint: {
        'circle-radius': 6,
        'circle-color': color('government', '#3f8efc'),
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#0d1319',
      },
    });

    // Cities + labels
    map.addSource('src-cities', { type: 'geojson', data: EMPTY_FC as never });
    map.addLayer({
      id: 'lyr-cities',
      type: 'circle',
      source: 'src-cities',
      paint: {
        'circle-radius': 8,
        'circle-color': color('cities', '#e8b64c'),
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0d1319',
      },
    });
    map.addLayer({
      id: 'lyr-cities-label',
      type: 'symbol',
      source: 'src-cities',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold'],
        'text-size': 13,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#eef2ee',
        'text-halo-color': '#0d1319',
        'text-halo-width': 1.5,
      },
    });

    // Hospitals (clustered)
    map.addSource('src-hospitals', {
      type: 'geojson',
      data: EMPTY_FC as never,
      cluster: true,
      clusterRadius: 45,
      clusterMaxZoom: 12,
    });
    map.addLayer({
      id: 'lyr-hospitals-clusters',
      type: 'circle',
      source: 'src-hospitals',
      filter: ['has', 'point_count'],
      paint: {
        'circle-radius': ['step', ['get', 'point_count'], 14, 5, 18, 15, 24],
        'circle-color': color('hospitals', '#e14d4d'),
        'circle-opacity': 0.85,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0d1319',
      },
    });
    map.addLayer({
      id: 'lyr-hospitals-count',
      type: 'symbol',
      source: 'src-hospitals',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Open Sans Semibold'],
        'text-size': 12,
      },
      paint: { 'text-color': '#ffffff' },
    });
    map.addLayer({
      id: 'lyr-hospitals-point',
      type: 'circle',
      source: 'src-hospitals',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 6,
        'circle-color': color('hospitals', '#e14d4d'),
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#0d1319',
      },
    });

    // Spatial query overlays (on top)
    map.addSource('src-query-results', { type: 'geojson', data: EMPTY_FC as never });
    map.addLayer({
      id: 'lyr-query-results',
      type: 'circle',
      source: 'src-query-results',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 12,
        'circle-color': 'rgba(232,182,76,0.15)',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#e8b64c',
      },
    });
    map.addLayer({
      id: 'lyr-query-results-line',
      type: 'line',
      source: 'src-query-results',
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: {
        'line-color': '#e8b64c',
        'line-width': 2,
        'line-dasharray': [2, 2],
      },
    });

    map.addSource('src-query-origin', { type: 'geojson', data: EMPTY_FC as never });
    map.addLayer({
      id: 'lyr-query-origin',
      type: 'circle',
      source: 'src-query-origin',
      paint: {
        'circle-radius': 7,
        'circle-color': '#eef2ee',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#e14d4d',
      },
    });

    for (const type of ['roads', 'government', 'cities', 'hospitals']) {
      map.on('mouseenter', subLayerIds(type)[0], () => {
        if (useAppStore.getState().queryMode === 'none') {
          map.getCanvas().style.cursor = 'pointer';
        }
      });
      map.on('mouseleave', subLayerIds(type)[0], () => {
        map.getCanvas().style.cursor =
          useAppStore.getState().queryMode === 'none' ? '' : 'crosshair';
      });
    }
  }, [mapLoaded, layers]);

  // --- push data from store into sources ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;
    for (const [type, fc] of Object.entries(layerData)) {
      const src = map.getSource(`src-${type}`) as
        | maplibregl.GeoJSONSource
        | undefined;
      src?.setData(fc as never);
    }
  }, [layerData, mapLoaded, layers]);

  // --- layer visibility ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;
    for (const [type, on] of Object.entries(visible)) {
      for (const id of subLayerIds(type)) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
        }
      }
    }
  }, [visible, mapLoaded, layers]);

  // --- query overlays ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;

    const originSrc = map.getSource('src-query-origin') as
      | maplibregl.GeoJSONSource
      | undefined;
    const resultSrc = map.getSource('src-query-results') as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!originSrc || !resultSrc) return;

    const originPoint = queryOrigin ?? pickedPoint;
    originSrc.setData(
      originPoint
        ? ({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: originPoint },
                properties: {},
              },
            ],
          } as never)
        : (EMPTY_FC as never),
    );

    if (nearbyResults) {
      resultSrc.setData(nearbyResults as never);
    } else if (nearestResult && queryOrigin) {
      const target = (nearestResult.geometry as { coordinates: [number, number] })
        .coordinates;
      resultSrc.setData({
        type: 'FeatureCollection',
        features: [
          nearestResult,
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [queryOrigin, target] },
            properties: {},
          },
        ],
      } as never);
    } else {
      resultSrc.setData(EMPTY_FC as never);
    }
  }, [queryOrigin, nearbyResults, nearestResult, pickedPoint, mapLoaded]);

  // --- cursor follows tool mode ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = queryMode === 'none' ? '' : 'crosshair';
  }, [queryMode]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
