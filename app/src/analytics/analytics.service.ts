import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from './analytics-event.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly events: Repository<AnalyticsEvent>,
  ) {}

  async recordVisit(visitorId: string, path: string) {
    const visitDate = new Date().toISOString().slice(0, 10);
    const existing = await this.events.findOne({ where: { visitorId, visitDate } });
    if (existing) return { accepted: true, duplicate: true };

    try {
      await this.events.save(this.events.create({
        visitorId,
        visitDate,
        path: path.startsWith('/') ? path : '/',
      }));
    } catch (error) {
      if (!(await this.events.findOne({ where: { visitorId, visitDate } }))) throw error;
    }
    return { accepted: true };
  }
}
