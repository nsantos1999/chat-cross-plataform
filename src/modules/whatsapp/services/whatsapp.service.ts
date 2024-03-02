import { Inject, Injectable, forwardRef } from '@nestjs/common';
import axios from 'axios';
import {
  MessagerService,
  MessagerServiceOption,
} from 'src/modules/message-switcher/services/messager-sender.service';
import { MessagerEnum } from 'src/modules/message-switcher/constants/enums/messager.enum';
import { MessageSwitcherService } from 'src/modules/message-switcher/services/message-switcher.service';
import { InteractiveContentButton } from '../@types/send-message-body.types';

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

  async sendMessage(
    phone: string,
    message: string,
    options?: MessagerServiceOption[],
  ) {
    const interactiveContent = this.getInteractiveContent(
      options || [],
      message,
    );

    try {
      await axios.post(
        `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_API_APP_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: interactiveContent ? 'interactive' : 'text',
          text: !interactiveContent
            ? {
                preview_url: true,
                body: message,
              }
            : undefined,
          interactive: interactiveContent,
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

  private getInteractiveContent(
    options: MessagerServiceOption[],
    message: string,
  ): InteractiveContentButton | undefined {
    const haveOptions = options.length > 0;

    let interactiveContent: InteractiveContentButton | undefined = undefined;

    if (haveOptions) {
      console.log('options');
      interactiveContent = {
        type: 'button',
        body: {
          text: message,
        },
        action: {
          buttons: options.map(({ id, title }) => {
            return {
              type: 'reply',
              reply: {
                id,
                title,
              },
            };
          }),
        },
      };
    }

    return interactiveContent;
  }
}
