import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  LocationRow,
  rowToFeature,
  toFeatureCollection,
} from '../geo';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RedisService } from '../redis/redis.service';
import { CreateLocationDto, PointDto, UpdateLocationDto } from './dto';

const SELECT_FEATURE = Prisma.sql`
  SELECT l.id, l.name, l.name_ar, l.layer_id, ly.type AS layer_type,
         l.properties, ST_AsGeoJSON(l.geom) AS geometry
  FROM locations l
  LEFT JOIN layers ly ON ly.id = l.layer_id
`;

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** WKT builder for POINT / LINESTRING from validated coordinates. */
  private toWkt(
    geometryType: 'POINT' | 'LINESTRING',
    coordinates: PointDto[],
  ): string {
    if (geometryType === 'POINT') {
      if (coordinates.length !== 1) {
        throw new BadRequestException('POINT requires exactly one coordinate');
      }
      const { lng, lat } = coordinates[0];
      return `POINT(${lng} ${lat})`;
    }
    if (coordinates.length < 2) {
      throw new BadRequestException('LINESTRING requires 2+ coordinates');
    }
    const pairs = coordinates.map((c) => `${c.lng} ${c.lat}`).join(', ');
    return `LINESTRING(${pairs})`;
  }

  async findAll(layerType?: string): Promise<GeoJsonFeatureCollection> {
    const cacheKey = `locations:${layerType ?? 'all'}`;
    const cached = await this.redis.getJson<GeoJsonFeatureCollection>(cacheKey);
    if (cached) return cached;

    const rows = layerType
      ? await this.prisma.$queryRaw<LocationRow[]>(
          Prisma.sql`${SELECT_FEATURE} WHERE ly.type = ${layerType} ORDER BY l.id`,
        )
      : await this.prisma.$queryRaw<LocationRow[]>(
          Prisma.sql`${SELECT_FEATURE} ORDER BY l.id`,
        );

    const fc = toFeatureCollection(rows);
    await this.redis.setJson(cacheKey, fc, 30);
    return fc;
  }

  async findOne(id: number): Promise<GeoJsonFeature> {
    const rows = await this.prisma.$queryRaw<LocationRow[]>(
      Prisma.sql`${SELECT_FEATURE} WHERE l.id = ${id}`,
    );
    if (rows.length === 0) {
      throw new NotFoundException(`Location ${id} not found`);
    }
    return rowToFeature(rows[0]);
  }

  async create(dto: CreateLocationDto): Promise<GeoJsonFeature> {
    const layer = await this.prisma.layer.findUnique({
      where: { id: dto.layerId },
    });
    if (!layer) {
      throw new BadRequestException(`Layer ${dto.layerId} does not exist`);
    }

    const wkt = this.toWkt(dto.geometryType, dto.coordinates);
    const props = JSON.stringify(dto.properties ?? {});

    const inserted = await this.prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO locations (name, name_ar, layer_id, properties, geom)
      VALUES (${dto.name}, ${dto.nameAr ?? null}, ${dto.layerId},
              ${props}::jsonb, ST_GeomFromText(${wkt}, 4326))
      RETURNING id
    `;

    await this.invalidateCaches();
    const feature = await this.findOne(inserted[0].id);
    this.realtime.broadcast('location:created', feature);
    return feature;
  }

  async update(id: number, dto: UpdateLocationDto): Promise<GeoJsonFeature> {
    await this.findOne(id); // 404 if missing

    if (dto.layerId !== undefined) {
      const layer = await this.prisma.layer.findUnique({
        where: { id: dto.layerId },
      });
      if (!layer) {
        throw new BadRequestException(`Layer ${dto.layerId} does not exist`);
      }
    }

    if (dto.name !== undefined || dto.nameAr !== undefined ||
        dto.layerId !== undefined || dto.properties !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE locations SET
          name       = COALESCE(${dto.name ?? null}, name),
          name_ar    = COALESCE(${dto.nameAr ?? null}, name_ar),
          layer_id   = COALESCE(${dto.layerId ?? null}, layer_id),
          properties = COALESCE(${
            dto.properties ? JSON.stringify(dto.properties) : null
          }::jsonb, properties)
        WHERE id = ${id}
      `;
    }

    if (dto.geometryType && dto.coordinates) {
      const wkt = this.toWkt(dto.geometryType, dto.coordinates);
      await this.prisma.$executeRaw`
        UPDATE locations
        SET geom = ST_GeomFromText(${wkt}, 4326)
        WHERE id = ${id}
      `;
    }

    await this.invalidateCaches();
    const feature = await this.findOne(id);
    this.realtime.broadcast('location:updated', feature);
    return feature;
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    await this.findOne(id); // 404 if missing
    await this.prisma.$executeRaw`DELETE FROM locations WHERE id = ${id}`;
    await this.invalidateCaches();
    this.realtime.broadcast('location:deleted', { id });
    return { deleted: true, id };
  }

  private async invalidateCaches() {
    await this.redis.invalidatePrefix('locations:');
    await this.redis.invalidatePrefix('spatial:');
    await this.redis.invalidatePrefix('stats:');
  }
}
