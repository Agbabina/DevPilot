import { Body, Controller, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { VisitDto } from './visit.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('visit')
  recordVisit(@Body() body: VisitDto) {
    return this.analyticsService.recordVisit(body.visitorId, body.path);
  }
}
