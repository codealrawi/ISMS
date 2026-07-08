import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class NearbyQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  /** Radius in meters (default 10 km, capped at 500 km). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500_000)
  radius?: number;

  @IsOptional()
  @IsString()
  layer?: string;
}

export class NearestQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class BboxQueryDto {
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) minLng: number;
  @Type(() => Number) @IsNumber() @Min(-90)  @Max(90)  minLat: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) maxLng: number;
  @Type(() => Number) @IsNumber() @Min(-90)  @Max(90)  maxLat: number;

  @IsOptional()
  @IsString()
  layer?: string;
}
