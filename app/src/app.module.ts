import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { ProjectsModule } from './projects/projects.module';
import { MilestonesModule } from './milestones/milestones.module';
import { AiModule } from './ai/ai.module';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { ProgressionModule } from './progression/progression.module';
import { ResourcesModule } from './resources/resources.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data.db',
      autoLoadEntities: true,
      synchronize: true,
    }),

    ProjectsModule,
    MilestonesModule,
    AiModule,
    TasksModule,
    AuthModule,
    ProgressionModule,
    ResourcesModule,
    AnalyticsModule,
    AdminModule,
    MessagesModule
  ],
})
export class AppModule {}
