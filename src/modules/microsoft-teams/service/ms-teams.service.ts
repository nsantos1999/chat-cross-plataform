import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  MessagerService,
  MessagerServiceOption,
  ReceiveMessageParams,
  SendMessageParams,
} from 'src/modules/message-switcher/services/messager-sender.service';
import { MessagerEnum } from 'src/modules/message-switcher/constants/enums/messager.enum';
import { MessageSwitcherService } from 'src/modules/message-switcher/services/message-switcher.service';
import {
  Activity,
  ActivityHandler,
  CardFactory,
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConversationReference,
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
  }

  getAdapter() {
    return this.adapter;
  }

  startListeners() {
    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    this.onMessage(async (context, next) => {
      console.log('received message', context.activity.text);

      await this.addConversationReference(context.activity);

      const attachments: Buffer[] | string[] = [];

      if (
        context.activity.attachments &&
        context.activity.attachments.length > 0
      ) {
        let handleError = false;
        for (const attachment of context.activity.attachments.filter(
          (attachment) => attachment.contentType !== 'text/html',
        )) {
          if (!attachment.content) {
            await context.sendActivity(
              `O arquivo enviado não é suportado. Caso tenha colado imagem no campo de mensagem, por favor, anexe-á`,
            );
            handleError = true;
          } else {
            attachments.push(attachment.content.downloadUrl);
          }
        }

        if (handleError) {
          await next();
          return;
        }
      }

      await this.receiveMessage({
        id: context.activity.from.id,
        message: context.activity?.value?.option || context.activity.text,
        attachments,
      });
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      await this.addConversationReference(context.activity);

      await context.sendActivity(
        `Olá! Registrei aqui seu usuário para receber mensagens. Seu ID de usuário é: ${context.activity.from.id}`,
      );
      await next();
    });
    this.onCommand(async (context, next) => {
      await next();
    });
  }

  async sendMessage({ id, text, options }: SendMessageParams): Promise<void> {
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

  async sendFile(id: string): Promise<void> {
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

  async receiveMessage({ id, message, attachments }: ReceiveMessageParams) {
    this.messageSwitcherService.receiveMessage({
      id,
      message,
      from: MessagerEnum.MS_TEAMS,
      attachments,
    });
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
