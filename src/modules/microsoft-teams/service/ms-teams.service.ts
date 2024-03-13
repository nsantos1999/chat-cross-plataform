import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  MessagerService,
  MessagerServiceOption,
} from 'src/modules/message-switcher/services/messager-sender.service';
import { MessagerEnum } from 'src/modules/message-switcher/constants/enums/messager.enum';
import { MessageSwitcherService } from 'src/modules/message-switcher/services/message-switcher.service';
import {
  ActionTypes,
  Activity,
  ActivityHandler,
  CardAction,
  CardFactory,
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConversationReference,
  MessageFactory,
  TurnContext,
  createBotFrameworkAuthenticationFromConfiguration,
} from 'botbuilder';
import { ConversationReferenceRepository } from '../repositories/conversation-reference.repository';
import { ConversationReferenceDocument } from '../schemas/conversation-reference.schema';
import { MappedCommands } from 'src/modules/message-switcher/constants/enums/mapped-commands.enum';

@Injectable()
export class MSTeamsService extends ActivityHandler implements MessagerService {
  private adapter: CloudAdapter;

  constructor(
    @Inject(forwardRef(() => MessageSwitcherService))
    private readonly messageSwitcherService: MessageSwitcherService,

    private readonly conversationReferenceRepository: ConversationReferenceRepository,
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
      console.log('received message', context.activity.text);
      // const replyText = `Echo: ${context.activity.text}`;
      // console.log(context);
      // await context.sendActivity(MessageFactory.text(replyText, replyText));
      await this.addConversationReference(context.activity);

      this.receiveMessage(
        context.activity.from.id,
        context.activity?.value?.option || context.activity.text,
      );

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
    this.onCommand(async (context, next) => {
      console.log('received command');
      // const replyText = `Echo: ${context.activity.text}`;
      // console.log(context);
      // await context.sendActivity(MessageFactory.text(replyText, replyText));
      console.log(context.activity);
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });
  }

  async sendMessage(
    id: string,
    text: string,
    options?: MessagerServiceOption[],
  ): Promise<void> {
    const conversationReference =
      await this.conversationReferenceRepository.findByUser(id);

    await this.getAdapter().continueConversationAsync(
      process.env.MICROSOFT_APP_ID,
      this.prepareConversationReference(conversationReference),
      async (context) => {
        if (options && options.length > 0) {
          await context.sendActivity({
            attachments: [this.buildAdaptiveCardWithOptions(text, options)],
          });
          return;
        }

        await context.sendActivity(text);
      },
    );

    // await this.getAdapter().process(null, null, async (context) => {
    //   await context.sendActivity(text);
    // });
    // throw new Error('Method not implemented.');
  }

  async sendFile(id: string, file: File): Promise<void> {
    const conversationReference =
      await this.conversationReferenceRepository.findByUser(id);

    await this.getAdapter().continueConversationAsync(
      process.env.MICROSOFT_APP_ID,
      this.prepareConversationReference(conversationReference),
      async (context) => {
        await context.sendActivity({
          attachments: [
            {
              contentType: 'image/png',
              contentUrl:
                'https://ascenty.com/wp-content/uploads/2023/11/1473061_Ascenty_Artigo-12_Mudancas-no-ambiente-cloudcapa-blog-1920x1000-c-default.png',
              name: 'Cloud-png.png',
            },
          ],
        });
      },
    );
  }

  async receiveMessage(id: string, message: string) {
    this.messageSwitcherService.receiveMessage(
      id,
      message,
      MessagerEnum.MS_TEAMS,
    );
  }

  private buildAdaptiveCardWithOptions(
    text: string,
    options?: MessagerServiceOption[],
  ) {
    const adaptiveCard = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      appId: process.env.MicrosoftAppId,
      body: [
        {
          type: 'TextBlock',
          size: 'Medium',
          weight: 'Bolder',
          text,
        },
        {
          type: 'ActionSet',
          actions: options.map((option) => ({
            type: 'Action.Submit',
            // verb: 'choose_category',
            title: option.title,
            data: {
              option: `${MappedCommands.TRANSFER_SERVICE} ${option.id}`,
            },
          })),
        },
      ],
      type: 'AdaptiveCard',
      version: '1.4',
    };

    return CardFactory.adaptiveCard(adaptiveCard);
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

    console.log(user);

    await this.conversationReferenceRepository.addNewIfNotFound({
      activityId,
      bot,
      channelId,
      conversation,
      locale,
      serviceUrl,
      user,
    });
  }

  private prepareConversationReference(
    conversationReferenceDocument: ConversationReferenceDocument,
  ) {
    const {
      activityId,
      bot: { id: botId, name: botName, role: botRole },
      channelId,
      conversation: { id: conversationId },
      locale,
      serviceUrl,
      user: {
        id: userId,
        name: userName,
        role: userRole,
        aadObjectId: userAadObjectId,
      },
    } = conversationReferenceDocument;

    const conversationReference: Partial<ConversationReference> = {
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
        aadObjectId: userAadObjectId,
      },
    };

    return conversationReference;
  }
}
