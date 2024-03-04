import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { MessagerService } from 'src/modules/message-switcher/services/messager-sender.service';
import { MessagerEnum } from 'src/modules/message-switcher/constants/enums/messager.enum';
import { MessageSwitcherService } from 'src/modules/message-switcher/services/message-switcher.service';
import {
  ActivityHandler,
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  createBotFrameworkAuthenticationFromConfiguration,
} from 'botbuilder';

@Injectable()
export class MicrosoftTeamsService
  extends ActivityHandler
  implements MessagerService
{
  private adapter: CloudAdapter;
  constructor(
    @Inject(forwardRef(() => MessageSwitcherService))
    private readonly messageSwitcherService: MessageSwitcherService,
  ) {
    super();

    const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
      MicrosoftAppId: process.env.MICROSOFT_APP_ID,
      MicrosoftAppPassword: process.env.MICROSOFT_APP_PASSWORD,
      MicrosoftAppType: process.env.MICROSOFT_APP_TYPE,
      MicrosoftAppTenantId: process.env.MICROSOFT_APP_TENANT_ID,
    });

    const botFrameworkAuthentication =
      createBotFrameworkAuthenticationFromConfiguration(
        null,
        credentialsFactory,
      );

    // Create adapter.
    // See https://aka.ms/about-bot-adapter to learn more about adapters.
    this.adapter = new CloudAdapter(botFrameworkAuthentication);

    this.startListeners();
    // console.log(this.adapter);
  }

  getAdapter() {
    return this.adapter;
  }

  startListeners() {
    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    this.onMessage(async (context, next) => {
      // const replyText = `Echo: ${context.activity.text}`;
      // console.log(context);
      // await context.sendActivity(MessageFactory.text(replyText, replyText));

      this.receiveMessage(context.activity.from.id, context.activity.text);
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });
  }

  async sendMessage(id: string, text: string): Promise<void> {
    await this.getAdapter().process(null, null, async (context) => {
      await context.sendActivity(text);
    });
    // throw new Error('Method not implemented.');
  }

  async receiveMessage(id: string, message: string) {
    this.messageSwitcherService.receiveMessage(
      id,
      message,
      MessagerEnum.MS_TEAMS,
    );
  }
}
