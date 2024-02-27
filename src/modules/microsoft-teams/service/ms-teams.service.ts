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

@Injectable()
export class MSTeamsService extends ActivityHandler implements MessagerService {
  private adapter: CloudAdapter;

  constructor(
    @Inject(forwardRef(() => MessageSwitcherService))
    private readonly messageSwitcherService: MessageSwitcherService,
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
      this.addConversationReference(context.activity);

      await context.sendActivity(
        'Olá! Registrei aqui seu usuário para receber mensagens',
      );
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });
  }

  async sendMessage(id: string, text: string): Promise<void> {
    const conversationReference = this.getConversationReference(id);

    console.log(conversationReference);
    await this.getAdapter().continueConversationAsync(
      process.env.MicrosoftAppId,
      conversationReference,
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

    console.log(conversationReference);

    const currentReference = this.getConversationReference(
      conversationReference.user.id,
    );

    if (!currentReference) {
      this.addNewConversationReference(conversationReference);
    }
  }

  private getConversationReference(userId: string) {
    const conversationReferences = this.getConversationReferences();

    return conversationReferences.find(
      (conversationReference) => conversationReference.user.id === userId,
    );
  }

  private getConversationReferences() {
    const fileContent = fs.readFileSync('conversationReferences.json');

    const fileText = fileContent.toString();

    let arrayOfReferences: Partial<ConversationReference>[] = [];

    if (fileText) {
      arrayOfReferences = JSON.parse(fileText);
    }

    return arrayOfReferences;
  }

  private addNewConversationReference(
    conversationReference: Partial<ConversationReference>,
  ) {
    const conversationReferences = this.getConversationReferences();

    conversationReferences.push(conversationReference);
    fs.writeFileSync(
      'conversationReferences.json',
      JSON.stringify(conversationReferences),
    );
  }
}
