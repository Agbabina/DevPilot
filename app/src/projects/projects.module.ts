import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project } from './projects.entity';
import { Milestone } from '../milestones/milestones.entity';
import { User } from '../auth/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Milestone, User]),
  ],

  controllers: [
    ProjectsController,
  ],

  providers: [
    ProjectsService,
  ],

  exports: [
    ProjectsService,
  ],
})
export class ProjectsModule {}

