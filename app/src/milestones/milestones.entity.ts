
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Project } from '../projects/projects.entity';
import { Task } from '../tasks/tasks.entity';

export enum MilestoneStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity()
export class Milestone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'text',
    default: MilestoneStatus.TODO,
  })
  status: MilestoneStatus;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: 0 })
  order: number;

  @Column({ default: 0 })
  xpReward: number;

  @Column()
  projectId: number;

  @ManyToOne(() => Project, (project) => project.milestones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany(() => Task, (task) => task.milestone)
  tasks: Task[];

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

