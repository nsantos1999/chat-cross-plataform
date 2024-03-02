import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WhatsAppService } from '../services/whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('/webhook/message')
  webhookChallengeWhatsAppBusiness(@Query() query: any) {
    console.log(query);
    return query['hub.challenge'];
  }

  @Post('/webhook/message')
  webhookWhatsAppBusiness(@Query() query: any, @Body() body: any) {
    if (!body?.entry[0]?.changes[0].value?.messages) {
      return;
    }

    console.log(body.entry[0].changes[0].value.messages[0]);

    const message =
      body.entry[0].changes[0].value.messages[0]?.text?.body ||
      body.entry[0].changes[0].value.messages[0]?.interactive?.button_reply?.id;

    this.whatsappService.receiveMessage(
      body.entry[0].changes[0].value.messages[0].from,
      message,
    );

    return query['hub.challenge'];
  }
}
