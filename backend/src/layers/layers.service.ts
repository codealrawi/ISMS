import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  GeoJsonFeatureCollection,
  LocationRow,
  toFeatureCollection,
} from '../geo';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LayersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const layers = await this.prisma.layer.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { locations: true } } },
    });
    return layers.map((l) => ({
      id: l.id,
      type: l.type,
      name: l.name,
      nameAr: l.nameAr,
      description: l.description,
      color: l.color,
      geometry: l.geometry,
      featureCount: l._count.locations,
    }));
  }

  /** GET /api/layers/:type — the layer's features as GeoJSON */
  async findByType(type: string): Promise<GeoJsonFeatureCollection> {
    const layer = await this.prisma.layer.findUnique({ where: { type } });
    if (!layer) {
      throw new NotFoundException(`Layer '${type}' not found`);
    }
    const rows = await this.prisma.$queryRaw<LocationRow[]>(Prisma.sql`
      SELECT l.id, l.name, l.name_ar, l.layer_id, ly.type AS layer_type,
             l.properties, ST_AsGeoJSON(l.geom) AS geometry
      FROM locations l
      JOIN layers ly ON ly.id = l.layer_id
      WHERE ly.type = ${type}
      ORDER BY l.id
    `);
    return toFeatureCollection(rows);
  }
}
