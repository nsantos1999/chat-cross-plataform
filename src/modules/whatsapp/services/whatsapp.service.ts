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
          // type: 'interactive',
          text: {
            preview_url: true,
            body: message,
          },
          // interactive: {
          //   type: 'button',
          //   body: {
          //     text: 'BUTTON_TEXT',
          //   },
          //   action: {
          //     buttons: [
          //       {
          //         type: 'reply',
          //         reply: {
          //           id: 'UNIQUE_BUTTON_ID_1',
          //           title: 'BUTTON_TITLE_1',
          //         },
          //       },
          //       {
          //         type: 'reply',
          //         reply: {
          //           id: 'UNIQUE_BUTTON_ID_2',
          //           title: 'BUTTON_TITLE_2',
          //         },
          //       },
          //     ],
          //   },
          // },
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
