import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestonesService } from './milestones.service';
@Controller('projects')
export class MilestonesController {
  constructor(
    private readonly milestonesService: MilestonesService,
  ) {}

  @Post(':projectId/milestones')
  createForProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createMilestoneDto: CreateMilestoneDto,
  ) {
    return this.milestonesService.createForProject(
      projectId,
      createMilestoneDto,
    );
  }

  @Get(':projectId/milestones')
  findAllForProject(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.milestonesService.findAllForProject(projectId);
  }
}

@Controller('milestones')
export class MilestonesEntityController {
  constructor(
    private readonly milestonesService: MilestonesService,
  ) {}

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.milestonesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(id, updateMilestoneDto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.milestonesService.remove(id);
  }
}
