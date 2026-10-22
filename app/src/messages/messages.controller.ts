import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post('send')
  send(@Req() req: any, @Body() body: { recipient: string; message: string }) {
    return this.messages.send(req.user.userId, body.recipient, body.message);
  }

  @Get('inbox')
  inbox(@Req() req: any, @Query('unread') unread?: string) {
    return this.messages.inbox(req.user.userId, unread === 'true');
  }

  @Post(':id/reply')
  reply(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: { message: string }) {
    return this.messages.reply(req.user.userId, id, body.message);
  }

  @Post(':id/forward')
  forward(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: { recipient: string }) {
    return this.messages.forward(req.user.userId, id, body.recipient);
  }

  @Post(':id/attach')
  attach(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: { taskId: number }) {
    return this.messages.attach(req.user.userId, id, body.taskId);
  }

  @Get('search')
  search(@Req() req: any, @Query('q') query: string) {
    return this.messages.search(req.user.userId, query || '');
  }
}
