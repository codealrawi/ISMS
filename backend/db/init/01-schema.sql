-- ============================================================
-- Iraq Smart Mapping System (ISMS) — PostGIS schema
-- Runs automatically on first container start.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Layers ----------
CREATE TABLE layers (
    id          SERIAL PRIMARY KEY,
    type        TEXT NOT NULL UNIQUE,          -- cities | hospitals | government | roads
    name        TEXT NOT NULL,
    name_ar     TEXT,
    description TEXT,
    color       TEXT NOT NULL DEFAULT '#3b82f6',
    geometry    TEXT NOT NULL DEFAULT 'POINT', -- POINT | LINESTRING
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Locations (spatial features) ----------
CREATE TABLE locations (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    name_ar     TEXT,
    layer_id    INTEGER REFERENCES layers(id) ON DELETE SET NULL,
    properties  JSONB NOT NULL DEFAULT '{}'::jsonb,
    geom        geometry(Geometry, 4326) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial + relational indexes
CREATE INDEX locations_geom_gist  ON locations USING GIST (geom);
CREATE INDEX locations_layer_idx  ON locations (layer_id);
CREATE INDEX locations_props_gin  ON locations USING GIN (properties);

-- ---------- Users ----------
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('admin', 'government_user', 'viewer')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER locations_touch
BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
