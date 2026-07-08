import { Controller, Get, Query } from '@nestjs/common';
import { BboxQueryDto, NearbyQueryDto, NearestQueryDto } from './dto';
import { SpatialService } from './spatial.service';

@Controller('spatial')
export class SpatialController {
  constructor(private readonly spatial: SpatialService) {}

  /** GET /api/spatial/nearby?lat=&lng=&radius=&layer= */
  @Get('nearby')
  nearby(@Query() q: NearbyQueryDto) {
    return this.spatial.nearby(q);
  }

  /** GET /api/spatial/nearest-hospital?lat=&lng= */
  @Get('nearest-hospital')
  nearestHospital(@Query() q: NearestQueryDto) {
    return this.spatial.nearestHospital(q);
  }

  /** GET /api/spatial/bbox?minLng=&minLat=&maxLng=&maxLat=&layer= */
  @Get('bbox')
  bbox(@Query() q: BboxQueryDto) {
    return this.spatial.bbox(q);
  }
}
