import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface Stats {
  totalLocations: number;
  totalLayers: number;
  totalUsers: number;
  byLayer: { type: string; name: string; count: number }[];
  generatedAt: string;
}

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async summary(): Promise<Stats> {
    const cached = await this.redis.getJson<Stats>('stats:summary');
    if (cached) return cached;

    const [totalLocations, totalLayers, totalUsers, layers] =
      await Promise.all([
        this.prisma.location.count(),
        this.prisma.layer.count(),
        this.prisma.user.count(),
        this.prisma.layer.findMany({
          orderBy: { id: 'asc' },
          include: { _count: { select: { locations: true } } },
        }),
      ]);

    const stats: Stats = {
      totalLocations,
      totalLayers,
      totalUsers,
      byLayer: layers.map((l) => ({
        type: l.type,
        name: l.name,
        count: l._count.locations,
      })),
      generatedAt: new Date().toISOString(),
    };

    await this.redis.setJson('stats:summary', stats, 30);
    return stats;
  }
}
