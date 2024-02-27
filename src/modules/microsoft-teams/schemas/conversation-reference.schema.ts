import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ChannelAccount, ConversationAccount } from 'botbuilder';
import { HydratedDocument } from 'mongoose';

@Schema()
export class ConversationReference {
  @Prop()
  'activityId': string;

  @Prop({
    type: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
  })
  'user': ChannelAccount;

  @Prop({
    type: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
  })
  'bot': ChannelAccount;

  @Prop({
    type: {
      id: { type: String },
    },
  })
  'conversation': ConversationAccount;

  @Prop()
  'channelId': string;

  @Prop()
  'locale': string;

  @Prop()
  'serviceUrl': string;
}

export type ConversationReferenceDocument =
  HydratedDocument<ConversationReference>;

export const ConversationReferenceSchema = SchemaFactory.createForClass(
  ConversationReference,
);
