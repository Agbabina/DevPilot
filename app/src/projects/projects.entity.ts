import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Milestone } from '../milestones/milestones.entity';
import { User } from '../auth/user.entity';

export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}
export enum ProjectStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

@Entity()
export class Project {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ default: 1 }) ownerId: number;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' }) owner: User;
  @Column({ nullable: true }) description: string;
  @Column({ type: 'text', nullable: true }) goals: string;
  @Column({ type: 'text', nullable: true }) requirements: string;
  @Column({ type: 'simple-json', nullable: true }) integrations:
    string[] | null;
  @Column({ type: 'datetime', nullable: true }) deadline: Date | null;
  @Column({ type: 'simple-json', nullable: true }) technologies:
    string[] | null;
  @Column({ nullable: true }) githubUrl: string;
  @Column({ type: 'text', default: ProjectPriority.MEDIUM })
  priority: ProjectPriority;
  @Column({ type: 'text', default: ProjectStatus.NOT_STARTED })
  status: ProjectStatus;
  @Column({ default: 0 }) progress: number;
  @Column({ default: 0 }) xpReward: number;
  @OneToMany(() => Milestone, (milestone) => milestone.project)
  milestones: Milestone[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
