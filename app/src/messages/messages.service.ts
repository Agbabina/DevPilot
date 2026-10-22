import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Task } from '../tasks/tasks.entity';
import { Message } from './message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
  ) {}

  private async user(username: string): Promise<User> {
    const clean = username.trim().replace(/^@/, '');
    if (!clean) throw new BadRequestException('Recipient username is required');
    const user = await this.users.findOne({ where: { username: clean } });
    if (!user) throw new NotFoundException('Recipient not found');
    return user;
  }

  private async visibleMessage(id: number, userId: number): Promise<Message> {
    const message = await this.messages.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId && message.recipientId !== userId) {
      throw new ForbiddenException('You cannot access this message');
    }
    return message;
  }

  private async present(message: Message) {
    const [sender, recipient] = await Promise.all([
      this.users.findOne({ where: { id: message.senderId }, select: ['id', 'username'] }),
      this.users.findOne({ where: { id: message.recipientId }, select: ['id', 'username'] }),
    ]);
    return { ...message, sender: sender && { id: sender.id, username: sender.username }, recipient: recipient && { id: recipient.id, username: recipient.username } };
  }

  async send(senderId: number, recipientName: string, body: string) {
    const recipient = await this.user(recipientName || '');
    const text = (body || '').trim();
    if (!text) throw new BadRequestException('Message cannot be empty');
    if (recipient.id === senderId) throw new BadRequestException('You cannot message yourself');
    const saved = await this.messages.save(this.messages.create({ senderId, recipientId: recipient.id, body: text, readAt: null, replyToId: null, forwardedFromId: null, taskId: null }));
    return this.present(saved);
  }

  async inbox(userId: number, unreadOnly: boolean) {
    const where: any = [{ recipientId: userId }, { senderId: userId }];
    const all = await this.messages.find({ where, order: { createdAt: 'DESC' }, take: 100 });
    const visible = all.filter((m) => !unreadOnly || (m.recipientId === userId && !m.readAt));
    const unread = visible.filter((m) => m.recipientId === userId && !m.readAt);
    if (!unreadOnly && unread.length) {
      const now = new Date();
      await this.messages.update(unread.map((m) => m.id), { readAt: now });
      unread.forEach((m) => { m.readAt = now; });
    }
    return Promise.all(visible.map((m) => this.present(m)));
  }

  async reply(userId: number, id: number, body: string) {
    const original = await this.visibleMessage(id, userId);
    const recipientId = original.senderId === userId ? original.recipientId : original.senderId;
    const text = (body || '').trim();
    if (!text) throw new BadRequestException('Reply cannot be empty');
    const saved = await this.messages.save(this.messages.create({ senderId: userId, recipientId, body: text, replyToId: original.id, forwardedFromId: null, taskId: original.taskId, readAt: null }));
    return this.present(saved);
  }

  async forward(userId: number, id: number, recipientName: string) {
    const original = await this.visibleMessage(id, userId);
    const recipient = await this.user(recipientName || '');
    if (recipient.id === userId) throw new BadRequestException('You cannot forward a message to yourself');
    const saved = await this.messages.save(this.messages.create({ senderId: userId, recipientId: recipient.id, body: original.body, replyToId: null, forwardedFromId: original.id, taskId: original.taskId, readAt: null }));
    return this.present(saved);
  }

  async attach(userId: number, id: number, taskId: number) {
    const message = await this.visibleMessage(id, userId);
    if (!Number.isInteger(taskId) || taskId < 1) throw new BadRequestException('A valid taskId is required');
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    message.taskId = task.id;
    return this.present(await this.messages.save(message));
  }

  async search(userId: number, query: string) {
    const q = query.trim();
    if (!q) throw new BadRequestException('Provide a search query using ?q=...');
    const matches = await this.messages.find({
      where: [
        { senderId: userId, body: Like('%' + q + '%') },
        { recipientId: userId, body: Like('%' + q + '%') },
      ],
      order: { createdAt: 'DESC' }, take: 100,
    });
    return Promise.all(matches.map((m) => this.present(m)));
  }
}
