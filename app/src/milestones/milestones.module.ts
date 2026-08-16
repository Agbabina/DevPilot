
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Project } from '../projects/projects.entity';

import { Milestone } from './milestones.entity';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Milestone,
      Project,
    ]),
  ],

  controllers: [
    MilestonesController,
  ],

  providers: [
    MilestonesService,
  ],

  exports: [
    MilestonesService,
  ],
})
export class MilestonesModule {}

