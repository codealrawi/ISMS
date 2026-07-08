import { Controller, Get, Param } from '@nestjs/common';
import { LayersService } from './layers.service';

@Controller('layers')
export class LayersController {
  constructor(private readonly layers: LayersService) {}

  @Get()
  findAll() {
    return this.layers.findAll();
  }

  @Get(':type')
  findByType(@Param('type') type: string) {
    return this.layers.findByType(type);
  }
}
