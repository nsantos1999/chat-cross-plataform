import { Inject, Injectable, forwardRef } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MessagerService,
  MessagerServiceOption,
  ReceiveMessageParams,
  SendMessageParams,
} from 'src/modules/message-switcher/services/messager-sender.service';
import { MessagerEnum } from 'src/modules/message-switcher/constants/enums/messager.enum';
import { MessageSwitcherService } from 'src/modules/message-switcher/services/message-switcher.service';
import { InteractiveContentButton } from '../@types/send-message-body.types';
import { RequestUtils } from 'src/utils/request.utils';

@Injectable()
export class WhatsAppService implements MessagerService {
  private readonly baseWhatsappApi = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_API_APP_ID}`;
  private apiWhatsapp: AxiosInstance;

  constructor(
    @Inject(forwardRef(() => MessageSwitcherService))
    private readonly messageSwitcherService: MessageSwitcherService,
  ) {
    this.apiWhatsapp = axios.create({
      baseURL: this.baseWhatsappApi,
    });

    this.apiWhatsapp.defaults.headers['Authorization'] =
      `Bearer ${process.env.WHATSAPP_API_TOKEN}`;
  }

  sendFile(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async receiveMessage({ id: phone, message }: ReceiveMessageParams) {
    this.messageSwitcherService.receiveMessage({
      id: phone,
      message,
      from: MessagerEnum.WHATSAPP,
    });
  }

  async sendMessage({
    id: phone,
    text,
    options,
    attachments,
  }: SendMessageParams) {
    const interactiveContent = this.getInteractiveContent(options || [], text);

    try {
      await this.apiWhatsapp.post(`/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: interactiveContent ? 'interactive' : 'text',
        text: !interactiveContent
          ? {
              preview_url: true,
              body: text,
            }
          : undefined,
        interactive: interactiveContent,
      });

      if (attachments && attachments.length > 0) {
        await this.sendAttachments(phone, attachments);
      }
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

  private async sendAttachments(
    phone: string,
    attachments: Buffer[] | string[],
  ) {
    try {
      for (const attachment of attachments) {
        if (typeof attachment === 'string') {
          const contentType = await this.getContentType(attachment);

          const isImage = contentType.search('image') !== -1;

          await this.apiWhatsapp.post('/messages', {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: isImage ? 'image' : 'document',
            document: !isImage
              ? {
                  link: attachment,
                }
              : undefined,
            image: isImage
              ? {
                  link: attachment,
                }
              : undefined,
          });
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  private getContentType(link: string) {
    return RequestUtils.getContentTypeFromLink(link);
  }
}
