import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema';
import { Service } from './service.schema';
import { MessagerEnum } from '../constants/enums/messager.enum';

@Schema({ timestamps: true })
export class Message {
  @Prop()
  text: string;

  @Prop({ type: Types.ObjectId, ref: User.name })
  customer?: User;

  @Prop()
  attendantId?: string;

  @Prop()
  attendantName?: string;

  @Prop()
  attendantAadObjectId?: string;

  @Prop({ type: Types.ObjectId, ref: Service.name })
  service: Service;

  @Prop({ enum: MessagerEnum })
  from: MessagerEnum;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type MessageDocument = HydratedDocument<Message>;

export const MessageSchema = SchemaFactory.createForClass(Message);
