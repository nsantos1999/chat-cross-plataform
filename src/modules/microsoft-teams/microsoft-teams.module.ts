import { Module, forwardRef } from '@nestjs/common';
import { MicrosoftTeamsController } from './controllers/microsoft-teams.controller';
import { MessageSwitcherModule } from '../message-switcher/message-switcher.module';
import { MSTeamsService } from './service/ms-teams.service';
import { MicrosoftTeamsService } from './service/microsoft-teams.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ConversationReference,
  ConversationReferenceSchema,
} from './schemas/conversation-reference.schema';
import { ConversationReferenceRepository } from './repositories/conversation-reference.repository';
import { MSTeamsApiGraphService } from './service/ms-teams-api-graph.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    forwardRef(() => MessageSwitcherModule),
    MongooseModule.forFeature([
      { name: ConversationReference.name, schema: ConversationReferenceSchema },
    ]),
  ],
  controllers: [MicrosoftTeamsController],
  providers: [
    MicrosoftTeamsService,
    MSTeamsService,
    ConversationReferenceRepository,
    MSTeamsApiGraphService,
    ConfigService,
  ],
  exports: [
    MSTeamsService,
    ConversationReferenceRepository,
    MSTeamsApiGraphService,
  ],
})
export class MicrosoftTeamsModule {}
