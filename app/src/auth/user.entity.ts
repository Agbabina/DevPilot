import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('users')
@Unique(['username'])
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ length: 50 })
  username: string;
  @Column({ length: 254 })
  email: string;
  @Column()
  passwordHash: string;
  @Column({default: 1})
  level: number;
  @Column({default: 0})
  totalXp: number;
  @Column({default: 0})
  coins: number;
  @Column({ default: 0 })
  currentStreak: number;
  @Column({ default: 0 })
  longestStreak: number;
  @Column({ type: "datetime", nullable: true })
  lastLoginAt: Date | null;
  @Column({nullable:true})
  githubUsername?: string;
  @Column({default: 0})
  streakShields: number;
  @Column({default: 0})
  aiCredits: number;

  @CreateDateColumn({type: "date", nullable:true})
  xpBoostExpiresAt?: Date;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}