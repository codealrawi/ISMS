import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { LocationsModule } from './locations/locations.module';
import { LayersModule } from './layers/layers.module';
import { SpatialModule } from './spatial/spatial.module';
import { StatsModule } from './stats/stats.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    RealtimeModule,
    LocationsModule,
    LayersModule,
    SpatialModule,
    StatsModule,
  ],
})
export class AppModule {}
