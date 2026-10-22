import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('messages')
@Index(['senderId', 'createdAt'])
@Index(['recipientId', 'readAt'])
export class Message {
  @PrimaryGeneratedColumn() id: number;
  @Column() senderId: number;
  @Column() recipientId: number;
  @Column({ type: 'text' }) body: string;
  @Column({ type: 'integer', nullable: true }) replyToId: number | null;
  @Column({ type: 'integer', nullable: true }) forwardedFromId: number | null;
  @Column({ type: 'integer', nullable: true }) taskId: number | null;
  @Column({ type: 'datetime', nullable: true }) readAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}
