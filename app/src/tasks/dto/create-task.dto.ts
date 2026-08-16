
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsDateString,
  IsString,
  Min,
} from 'class-validator';

import {
  TaskPriority,
  TaskStatus,
} from '../tasks.entity';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;
}


