import { Inject, Injectable, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { MessagerService } from 'src/modules/message-switcher/services/messager-sender.service';
import { MessagerEnum } from 'src/modules/message-switcher/constants/enums/messager.enum';
import { MessageSwitcherService } from 'src/modules/message-switcher/services/message-switcher.service';

@Injectable()
export class WhatsAppService implements MessagerService {
  constructor(
    @Inject(forwardRef(() => MessageSwitcherService))
    private readonly messageSwitcherService: MessageSwitcherService,
  ) {}

  async receiveMessage(phone: string, message: string) {
    this.messageSwitcherService.receiveMessage(
      phone,
      message,
      MessagerEnum.WHATSAPP,
    );
  }

  async sendMessage(phone: string, message: string) {
    try {
      const { data } = await axios.post(
        'https://graph.facebook.com/v18.0/240305365833042/messages',
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'text',
          text: {
            preview_url: true,
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          },
        },
      );
    } catch (err) {
      console.log(err.response);
    }
  }
}
