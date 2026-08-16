
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Milestone } from '../milestones/milestones.entity';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'text',
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: 'text',
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ default: 0 })
  order: number;

  @Column({ default: 0 })
  xpReward: number;

  @Column()
  milestoneId: number;

  @ManyToOne(() => Milestone, (milestone) => milestone.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'milestoneId' })
  milestone: Milestone;

  @CreateDateColumn()
  createdAt: Date;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  completedAt?: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}

