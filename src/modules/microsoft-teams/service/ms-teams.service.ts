import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { MessagerService } from 'src/modules/message-switcher/services/messager-sender.service';
import { MessagerEnum } from 'src/modules/message-switcher/constants/enums/messager.enum';
import { MessageSwitcherService } from 'src/modules/message-switcher/services/message-switcher.service';
import {
  Activity,
  ActivityHandler,
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConversationReference,
  TurnContext,
  createBotFrameworkAuthenticationFromConfiguration,
} from 'botbuilder';
import * as fs from 'fs';
import { ConversarionReferenceRepository } from '../repositories/conversation-reference.repository';

@Injectable()
export class MSTeamsService extends ActivityHandler implements MessagerService {
  private adapter: CloudAdapter;

  constructor(
    @Inject(forwardRef(() => MessageSwitcherService))
    private readonly messageSwitcherService: MessageSwitcherService,

    private readonly conversarionReferenceRepository: ConversarionReferenceRepository,
  ) {
    super();

    const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
      MicrosoftAppId: process.env.MicrosoftAppId,
      MicrosoftAppPassword: process.env.MicrosoftAppPassword,
      MicrosoftAppType: process.env.MicrosoftAppType,
      MicrosoftAppTenantId: process.env.MicrosoftAppTenantId,
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

    this.onMembersAdded(async (context, next) => {
      // const replyText = `Echo: ${context.activity.text}`;
      // console.log(context);
      // await context.sendActivity(MessageFactory.text(replyText, replyText));
      await this.addConversationReference(context.activity);

      await context.sendActivity(
        `Olá! Registrei aqui seu usuário para receber mensagens. Seu ID de usuário é: ${context.activity.from.id}`,
      );
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });
  }

  async sendMessage(id: string, text: string): Promise<void> {
    const conversationReference =
      await this.conversarionReferenceRepository.findByUser(id);

    const {
      activityId,
      bot: { id: botId, name: botName, role: botRole },
      channelId,
      conversation: { id: conversationId },
      locale,
      serviceUrl,
      user: { id: userId, name: userName, role: userRole },
    } = conversationReference;

    await this.getAdapter().continueConversationAsync(
      process.env.MicrosoftAppId,
      {
        activityId,
        bot: {
          id: botId,
          name: botName,
          role: botRole,
        },
        channelId,
        conversation: {
          id: conversationId,
          isGroup: false,
          conversationType: '',
          name: '',
        },
        locale,
        serviceUrl,
        user: {
          id: userId,
          name: userName,
          role: userRole,
        },
      },
      async (context) => {
        await context.sendActivity(text);
      },
    );

    // await this.getAdapter().process(null, null, async (context) => {
    //   await context.sendActivity(text);
    // });
    // throw new Error('Method not implemented.');
  }

  async receiveMessage(id: string, message: string) {
    this.messageSwitcherService.receiveMessage(
      id,
      message,
      MessagerEnum.MS_TEAMS,
    );
  }

  private async addConversationReference(activity: Activity) {
    const conversationReference =
      TurnContext.getConversationReference(activity);

    const {
      activityId,
      bot,
      channelId,
      conversation,
      locale,
      serviceUrl,
      user,
    } = conversationReference;

    console.log('adding new');
    await this.conversarionReferenceRepository.addNewIfNotFound({
      activityId,
      bot,
      channelId,
      conversation,
      locale,
      serviceUrl,
      user,
    });
  }
}
