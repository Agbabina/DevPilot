import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('messages')
@Index(['senderId', 'createdAt'])
@Index(['recipientId', 'readAt'])
export class Message {
  @PrimaryGeneratedColumn() id: number;
  @Column() senderId: number;
  @Column() recipientId: number;
  @Column({ type: 'text' }) body: string;
  @Column({ nullable: true }) replyToId: number | null;
  @Column({ nullable: true }) forwardedFromId: number | null;
  @Column({ nullable: true }) taskId: number | null;
  @Column({ type: 'datetime', nullable: true }) readAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}
