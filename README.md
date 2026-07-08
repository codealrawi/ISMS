# 🇮🇶 ISMS — Iraq Smart Mapping System

A sovereign, government-grade GIS platform for Iraq. Monorepo containing a NestJS + PostGIS core API, a React + MapLibre web client, Redis caching, real-time WebSocket updates, and a fully Dockerized deployment behind an Nginx gateway.

```
isms/
├── docker-compose.yml        # postgres+postgis, redis, backend, frontend, nginx
├── .env.example
├── nginx/
│   └── nginx.conf            # reverse proxy: / → frontend, /api + /socket.io → backend
├── backend/                  # NestJS (TypeScript) — Core GIS API
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/schema.prisma  # typed client; geometry via Unsupported + raw SQL
│   ├── db/init/
│   │   ├── 01-schema.sql     # PostGIS extension, tables, GiST/GIN indexes
│   │   └── 02-seed.sql       # Iraqi cities, hospitals, gov buildings, highways, users
│   └── src/
│       ├── main.ts           # bootstrap, /api prefix, validation
│       ├── app.module.ts
│       ├── geo.ts            # GeoJSON helpers for PostGIS rows
│       ├── auth/             # JWT login, bearer guard, role guard (admin/government_user/viewer)
│       ├── locations/        # CRUD, WKT geometry writes, GeoJSON reads
│       ├── layers/           # layer catalog + per-layer GeoJSON
│       ├── spatial/          # nearby (ST_DWithin), nearest hospital (KNN <->), bbox
│       ├── stats/            # /api/stats analytics summary
│       ├── realtime/         # socket.io gateway (location:created/updated/deleted)
│       ├── redis/            # best-effort cache (spatial + stats + layer reads)
│       └── prisma/           # PrismaService
└── frontend/                 # React 18 + TypeScript + MapLibre GL + Tailwind + Zustand
    ├── Dockerfile            # vite build → nginx static
    ├── nginx.spa.conf
    └── src/
        ├── App.tsx           # shell, live socket refresh
        ├── api/client.ts
        ├── store/useAppStore.ts
        └── components/
            ├── MapView.tsx   # OSM tiles, 4 layers, hospital clustering, popups, query overlays
            ├── Sidebar.tsx   # layer toggles, radius + nearest-hospital tools, stats
            └── AdminPanel.tsx# JWT login, add/edit/delete locations, pick-on-map
```

## Run it

Requirements: Docker + Docker Compose. Internet access is needed at runtime for OSM basemap tiles.

```bash
docker-compose up --build
```

Then open **http://localhost:8080**

The Postgres container runs `db/init/*.sql` on first start (PostGIS extension, schema, GiST indexes, seed data). To re-seed from scratch: `docker-compose down -v && docker-compose up --build`.

### Seeded accounts

| Username | Password    | Role            | Permissions                       |
|----------|-------------|-----------------|-----------------------------------|
| admin    | admin123    | admin           | create, edit, delete locations    |
| gov      | gov123      | government_user | create, edit locations            |
| viewer   | viewer123   | viewer          | read-only                         |

### Environment variables

Set in `docker-compose.yml` (copy `.env.example` to `backend/.env` for local, non-Docker development):

| Variable      | Default (compose)                                        |
|---------------|----------------------------------------------------------|
| DATABASE_URL  | postgresql://isms:isms_secret@postgres:5432/isms         |
| REDIS_URL     | redis://redis:6379                                       |
| JWT_SECRET    | change-me-in-production                                  |
| PORT          | 3000                                                     |

## API reference (all under `/api`, GeoJSON responses)

Auth
- `POST /api/auth/login` — `{username, password}` → `{access_token, user}`
- `GET  /api/auth/me` — current JWT payload (Bearer token)

Locations
- `GET    /api/locations` — FeatureCollection (optional `?layer=hospitals`)
- `GET    /api/locations/:id` — single Feature
- `POST   /api/locations` — admin/government_user. Body: `{name, nameAr?, layerId, geometryType: "POINT"|"LINESTRING", coordinates: [{lat,lng},…], properties?}`
- `PATCH  /api/locations/:id` — admin/government_user
- `DELETE /api/locations/:id` — admin only

Layers
- `GET /api/layers` — catalog with colors + feature counts
- `GET /api/layers/:type` — that layer's features as GeoJSON (`cities | hospitals | government | roads`)

Spatial (PostGIS)
- `GET /api/spatial/nearby?lat=&lng=&radius=&layer=` — `ST_DWithin` on geography (meters), distance included, Redis-cached 60 s
- `GET /api/spatial/nearest-hospital?lat=&lng=` — KNN `<->` index-assisted nearest neighbour
- `GET /api/spatial/bbox?minLng=&minLat=&maxLng=&maxLat=&layer=` — `&&` bounding-box intersection

Analytics
- `GET /api/stats` — totals and per-layer feature counts

### Quick smoke test

```bash
# nearest hospital to central Baghdad
curl 'http://localhost:8080/api/spatial/nearest-hospital?lat=33.3152&lng=44.3661'

# everything within 30 km of Baghdad
curl 'http://localhost:8080/api/spatial/nearby?lat=33.3152&lng=44.3661&radius=30000'

# login and create a location
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -X POST http://localhost:8080/api/locations \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Najaf","nameAr":"النجف","layerId":1,"geometryType":"POINT","coordinates":[{"lat":32.0000,"lng":44.3300}]}'
```

## Design notes

- **Geometry handling.** The schema is created with raw SQL (`db/init/01-schema.sql`) because PostGIS extensions and GiST indexes are outside Prisma's migration DSL. Prisma models mirror the tables (`Unsupported("geometry")`), so relational reads stay typed while all spatial reads/writes use `$queryRaw` with `ST_AsGeoJSON`, `ST_GeomFromText`, `ST_DWithin::geography`, and the `<->` KNN operator.
- **Caching.** Redis caches layer reads (30 s), spatial nearby results (60 s), and stats; every write invalidates the `locations:`, `spatial:` and `stats:` prefixes. Redis failure degrades gracefully to direct PostGIS queries.
- **Real time.** A socket.io gateway broadcasts `location:*` events; every connected map refreshes automatically. The same channel is structured to carry live traffic/sensor feeds later.
- **Basemap.** OSM raster tiles are used as the demo basemap. For fully sovereign operation, point the `osm` source in `MapView.tsx` at a self-hosted tile server (e.g. TileServer GL / OpenMapTiles with an Iraq extract) — the rest of the stack is already offline-capable.
- **Mobile-ready.** The API is pure JSON/GeoJSON over REST + WebSocket with JWT auth, so a React Native / Flutter client can consume it as-is; MapLibre Native renders the same layer data.
