import { CreateDateColumn, Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('analytics_events')
@Unique(['visitorId', 'visitDate'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 128 })
  visitorId: string;

  @Column({ length: 10 })
  visitDate: string;

  @Column({ length: 512, default: '/' })
  path: string;

  @CreateDateColumn()
  createdAt: Date;
}
