import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('visit')
  @HttpCode(204)
  async recordVisit(@Body() body: { visitorId?: unknown; path?: unknown }): Promise<void> {
    if (typeof body?.visitorId !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(body.visitorId)) {
      throw new BadRequestException('A valid anonymous visitor ID is required.');
    }
    if (typeof body.path !== 'string' || !body.path.startsWith('/') || body.path.length > 500) {
      throw new BadRequestException('A valid page path is required.');
    }
    // Track path only; strip query strings and fragments to avoid collecting accidental personal data.
    const path = body.path.split(/[?#]/, 1)[0] || '/';
    await this.analytics.recordVisit(body.visitorId, path);
  }

  @Get('admin/overview')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAdminOverview(@Req() _request: unknown) {
    return this.analytics.overview();
  }
}
