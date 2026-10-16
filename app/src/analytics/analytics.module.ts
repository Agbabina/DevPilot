import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/user.entity';
import { AdminGuard } from './admin.guard';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { SiteVisit } from './site-visit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SiteVisit, User]), AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AdminGuard],
})
export class AnalyticsModule {}
