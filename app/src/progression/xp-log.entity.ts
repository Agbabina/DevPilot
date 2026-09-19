import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, Unique } from 'typeorm';

@Entity()
@Unique('UQ_xp_log_github_commit', ['userId', 'reason', 'metadata'])
export class XpLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  amount: number;

  @Column()
  reason: string;

  @Column({ nullable: true })
  metadata?: string;

  @CreateDateColumn()
  createdAt: Date;
}
