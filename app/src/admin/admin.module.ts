import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../auth/user.entity';
import { AnalyticsEvent } from '../analytics/analytics-event.entity';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User, AnalyticsEvent])],
  controllers: [AdminController],
  providers: [AdminGuard, AdminService],
})
export class AdminModule {}
