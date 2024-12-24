import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('conversations')
@Controller('conversation')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}
  @Get('')
  async getConversationsByUser(@Req() request) {
    return this.conversationService.getConversationsByUser(request.user);
  }

  @Get(':slug')
  async getConversationMessages(@Req() request, @Param('slug') slug: string) {
    return this.conversationService.getConversationMessages(request.user, slug);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async createConversation(@Req() request) {
    return this.conversationService.createConversation(request.user);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async renameConversation(
    @Param('id') id: number,
    @Body() dto: { title: string },
  ) {
    return this.conversationService.renameConversation(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteConversation(@Param('id') id: number) {
    return this.conversationService.deleteConversation(id);
  }
}
