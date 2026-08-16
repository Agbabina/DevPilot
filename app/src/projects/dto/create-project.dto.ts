import {
  IsEnum,
  IsInt,
  IsOptional,
  IsDateString,
  IsArray,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

import {
  ProjectPriority,
  ProjectStatus,
} from '../projects.entity';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  goals?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrations?: string[];

  @IsOptional()
  githubUrl?: string;

  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;
}


