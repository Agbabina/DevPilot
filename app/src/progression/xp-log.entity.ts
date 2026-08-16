import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
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
