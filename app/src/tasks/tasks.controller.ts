
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

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller()
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
  ) {}

  @Post('milestones/:milestoneId/tasks')
  createForMilestone(
    @Param(
      'milestoneId',
      ParseIntPipe,
    )
    milestoneId: number,

    @Body()
    createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.createForMilestone(
      milestoneId,
      createTaskDto,
    );
  }

  @Get('milestones/:milestoneId/tasks')
  findAllForMilestone(
    @Param(
      'milestoneId',
      ParseIntPipe,
    )
    milestoneId: number,
  ) {
    return this.tasksService.findAllForMilestone(
      milestoneId,
    );
  }

  @Get('tasks/:id')
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.tasksService.findOne(id);
  }

  @Patch('tasks/:id')
  update(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(
      id,
      updateTaskDto,
    );
  }

  @Delete('tasks/:id')
  remove(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.tasksService.remove(id);
  }
}

