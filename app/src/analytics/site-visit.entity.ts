import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('site_visits')
@Index(['visitorHash', 'createdAt'])
export class SiteVisit {
  @PrimaryGeneratedColumn()
  id: number;

  // A one-way hash of a random browser-generated ID; no names, emails, or IPs are stored.
  @Column({ length: 64 })
  visitorHash: string;

  @Column({ length: 255 })
  path: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
