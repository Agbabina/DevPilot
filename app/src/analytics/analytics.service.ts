import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { SiteVisit } from './site-visit.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(SiteVisit) private readonly visits: Repository<SiteVisit>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async recordVisit(visitorId: string, path: string): Promise<void> {
    const visitorHash = createHash('sha256').update(visitorId).digest('hex');
    await this.visits.save(this.visits.create({ visitorHash, path: path.slice(0, 255) }));
  }

  private sqliteDate(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }

  private async uniqueVisitorsSince(since?: Date): Promise<number> {
    const query = this.visits.createQueryBuilder('visit')
      .select('COUNT(DISTINCT visit.visitorHash)', 'count');
    if (since) query.where('visit.createdAt >= :since', { since: this.sqliteDate(since) });
    const result = await query.getRawOne<{ count: string | number }>();
    return Number(result?.count || 0);
  }

  async overview() {
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
    fourteenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [registeredUsers, newUsersToday, pageViews, pageViewsToday, uniqueVisitors, uniqueVisitorsToday, uniqueVisitors7d, recentUsers, recentVisits] = await Promise.all([
      this.users.count(),
      this.users.createQueryBuilder('user').where('user.createdAt >= :today', { today: this.sqliteDate(today) }).getCount(),
      this.visits.count(),
      this.visits.createQueryBuilder('visit').where('visit.createdAt >= :today', { today: today.toISOString() }).getCount(),
      this.uniqueVisitorsSince(),
      this.uniqueVisitorsSince(today),
      this.uniqueVisitorsSince(sevenDaysAgo),
      this.users.find({ select: { id: true, username: true, email: true, createdAt: true }, order: { createdAt: 'DESC' }, take: 10 }),
      this.visits.createQueryBuilder('visit').where('visit.createdAt >= :since', { since: this.sqliteDate(fourteenDaysAgo) }).orderBy('visit.createdAt', 'ASC').getMany(),
    ]);

    const dailyMap = new Map<string, { date: string; pageViews: number; visitors: Set<string> }>();
    for (let offset = 0; offset < 14; offset++) {
      const day = new Date(fourteenDaysAgo.getTime() + offset * 24 * 60 * 60 * 1000);
      const key = day.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, pageViews: 0, visitors: new Set<string>() });
    }
    const pages = new Map<string, number>();
    for (const visit of recentVisits) {
      const key = new Date(visit.createdAt).toISOString().slice(0, 10);
      const day = dailyMap.get(key);
      if (day) { day.pageViews++; day.visitors.add(visit.visitorHash); }
      pages.set(visit.path, (pages.get(visit.path) || 0) + 1);
    }

    return {
      generatedAt: now.toISOString(),
      totals: { registeredUsers, newUsersToday, pageViews, pageViewsToday, uniqueVisitors, uniqueVisitorsToday, uniqueVisitors7d },
      daily: Array.from(dailyMap.values()).map((day) => ({ date: day.date, pageViews: day.pageViews, uniqueVisitors: day.visitors.size })),
      topPages: Array.from(pages.entries()).map(([path, count]) => ({ path, views: count })).sort((a, b) => b.views - a.views).slice(0, 8),
      recentUsers: recentUsers.map((user) => ({ id: user.id, username: user.username, email: user.email, createdAt: user.createdAt })),
    };
  }
}
