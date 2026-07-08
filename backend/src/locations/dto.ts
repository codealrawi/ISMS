import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsInt()
  layerId: number;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsIn(['POINT', 'LINESTRING'])
  geometryType: 'POINT' | 'LINESTRING';

  /** POINT: exactly one entry. LINESTRING: two or more. */
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  coordinates: PointDto[];
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsInt()
  layerId?: number;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['POINT', 'LINESTRING'])
  geometryType?: 'POINT' | 'LINESTRING';

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  coordinates?: PointDto[];
}
