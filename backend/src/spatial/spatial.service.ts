import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  LocationRow,
  rowToFeature,
  toFeatureCollection,
} from '../geo';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BboxQueryDto, NearbyQueryDto, NearestQueryDto } from './dto';

@Injectable()
export class SpatialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Locations within `radius` meters of a point.
   * geography casts give true meter distances; the GiST index on
   * geom is used through the ST_DWithin geography overlap.
   */
  async nearby(q: NearbyQueryDto): Promise<GeoJsonFeatureCollection> {
    const radius = q.radius ?? 10_000;
    const cacheKey = `spatial:nearby:${q.lat}:${q.lng}:${radius}:${q.layer ?? 'all'}`;
    const cached = await this.redis.getJson<GeoJsonFeatureCollection>(cacheKey);
    if (cached) return cached;

    const layerFilter = q.layer
      ? Prisma.sql`AND ly.type = ${q.layer}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<LocationRow[]>(Prisma.sql`
      SELECT l.id, l.name, l.name_ar, l.layer_id, ly.type AS layer_type,
             l.properties, ST_AsGeoJSON(l.geom) AS geometry,
             ST_Distance(
               l.geom::geography,
               ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography
             ) AS distance_m
      FROM locations l
      LEFT JOIN layers ly ON ly.id = l.layer_id
      WHERE ST_DWithin(
              l.geom::geography,
              ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography,
              ${radius}
            )
        ${layerFilter}
      ORDER BY distance_m ASC
      LIMIT 200
    `);

    const fc = toFeatureCollection(rows);
    await this.redis.setJson(cacheKey, fc, 60);
    return fc;
  }

  /** Nearest hospital to a point (KNN via geography distance). */
  async nearestHospital(q: NearestQueryDto): Promise<GeoJsonFeature> {
    const rows = await this.prisma.$queryRaw<LocationRow[]>(Prisma.sql`
      SELECT l.id, l.name, l.name_ar, l.layer_id, ly.type AS layer_type,
             l.properties, ST_AsGeoJSON(l.geom) AS geometry,
             ST_Distance(
               l.geom::geography,
               ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography
             ) AS distance_m
      FROM locations l
      JOIN layers ly ON ly.id = l.layer_id
      WHERE ly.type = 'hospitals'
      ORDER BY l.geom <-> ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)
      LIMIT 1
    `);
    if (rows.length === 0) {
      throw new NotFoundException('No hospitals in database');
    }
    return rowToFeature(rows[0]);
  }

  /** All features intersecting a bounding box. */
  async bbox(q: BboxQueryDto): Promise<GeoJsonFeatureCollection> {
    const layerFilter = q.layer
      ? Prisma.sql`AND ly.type = ${q.layer}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<LocationRow[]>(Prisma.sql`
      SELECT l.id, l.name, l.name_ar, l.layer_id, ly.type AS layer_type,
             l.properties, ST_AsGeoJSON(l.geom) AS geometry
      FROM locations l
      LEFT JOIN layers ly ON ly.id = l.layer_id
      WHERE l.geom && ST_MakeEnvelope(
              ${q.minLng}, ${q.minLat}, ${q.maxLng}, ${q.maxLat}, 4326)
        ${layerFilter}
      ORDER BY l.id
      LIMIT 1000
    `);
    return toFeatureCollection(rows);
  }
}
