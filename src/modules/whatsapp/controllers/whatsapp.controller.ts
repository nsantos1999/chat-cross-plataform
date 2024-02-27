import { Body, Controller, Post, Query } from '@nestjs/common';
import { WhatsAppService } from '../services/whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('/webhook/message')
  webhookTestWhatsAppBusiness(@Query() query: any, @Body() body: any) {
    this.whatsappService.receiveMessage(
      body.entry[0].changes[0].value.messages[0].from,
      body.entry[0].changes[0].value.messages[0].text.body,
    );

    return query['hub.challenge'];
  }
}
