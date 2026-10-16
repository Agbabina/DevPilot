import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from '../analytics/analytics-event.entity';
import { User } from '../auth/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AnalyticsEvent) private readonly events: Repository<AnalyticsEvent>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - 6);
    const startDate = start.toISOString().slice(0, 10);

    const [totalUsers, totalVisits, totalUniqueVisitors, visitsToday, uniqueVisitorsLast7Days, daily, recentUsers] = await Promise.all([
      this.users.count(),
      this.events.count(),
      this.events.createQueryBuilder('event').select('COUNT(DISTINCT event.visitorId)', 'count').getRawOne<{ count: string }>(),
      this.events.count({ where: { visitDate: today } }),
      this.events.createQueryBuilder('event').select('COUNT(DISTINCT event.visitorId)', 'count').where('event.visitDate >= :startDate', { startDate }).getRawOne<{ count: string }>(),
      this.events.createQueryBuilder('event').select('event.visitDate', 'date').addSelect('COUNT(*)', 'visits').addSelect('COUNT(DISTINCT event.visitorId)', 'uniqueVisitors').where('event.visitDate >= :startDate', { startDate }).groupBy('event.visitDate').orderBy('event.visitDate', 'ASC').getRawMany<{ date: string; visits: string; uniqueVisitors: string }>(),
      this.users.find({ select: { id: true, username: true, email: true, createdAt: true }, order: { createdAt: 'DESC' }, take: 10 }),
    ]);

    const dailyMap = new Map(daily.map((row) => [row.date, row]));
    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + index);
      const date = day.toISOString().slice(0, 10);
      const row = dailyMap.get(date);
      return { date, visits: Number(row?.visits ?? 0), uniqueVisitors: Number(row?.uniqueVisitors ?? 0) };
    });

    return {
      totalUsers,
      totalVisits,
      totalUniqueVisitors: Number(totalUniqueVisitors?.count ?? 0),
      visitsToday,
      uniqueVisitorsLast7Days: Number(uniqueVisitorsLast7Days?.count ?? 0),
      daily: lastSevenDays,
      recentUsers: recentUsers.map(({ id, username, email, createdAt }) => ({ id, username, email, createdAt })),
    };
  }
}
