/** Shared GeoJSON helpers for rows returned by PostGIS $queryRaw. */

export interface LocationRow {
  id: number;
  name: string;
  name_ar: string | null;
  layer_id: number | null;
  layer_type: string | null;
  properties: Record<string, unknown>;
  geometry: string; // ST_AsGeoJSON output
  distance_m?: number | null;
}

export interface GeoJsonFeature {
  type: 'Feature';
  id: number;
  geometry: unknown;
  properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export function rowToFeature(row: LocationRow): GeoJsonFeature {
  return {
    type: 'Feature',
    id: row.id,
    geometry: JSON.parse(row.geometry),
    properties: {
      id: row.id,
      name: row.name,
      name_ar: row.name_ar,
      layer_id: row.layer_id,
      layer_type: row.layer_type,
      ...(row.distance_m !== undefined && row.distance_m !== null
        ? { distance_m: Math.round(Number(row.distance_m)) }
        : {}),
      ...row.properties,
    },
  };
}

export function toFeatureCollection(
  rows: LocationRow[],
): GeoJsonFeatureCollection {
  return { type: 'FeatureCollection', features: rows.map(rowToFeature) };
}
