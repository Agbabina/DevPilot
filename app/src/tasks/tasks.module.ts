
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Milestone } from '../milestones/milestones.entity';
import { MilestonesModule } from '../milestones/milestones.module';

import { Task } from './tasks.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ProgressionModule } from '../progression/progression.module';

@Module({
  imports: [
  TypeOrmModule.forFeature([
      Task,
      Milestone,
    ]),
    MilestonesModule,
    ProgressionModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

