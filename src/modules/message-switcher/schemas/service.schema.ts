import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ServiceStatusEnum } from '../constants/enums/service-status.enum';
import { User } from './user.schema';

@Schema({ timestamps: true, _id: true, selectPopulatedPaths: true })
export class Service {
  @Prop({ type: Types.ObjectId, ref: User.name })
  customer: User;

  @Prop()
  firstMessage: string;

  @Prop()
  attendantId?: string;

  @Prop()
  attendantName?: string;

  @Prop()
  attendantAadObjectId?: string;

  @Prop()
  sector?: string;

  @Prop({ enum: ServiceStatusEnum })
  status: ServiceStatusEnum;

  @Prop()
  slaMinutes?: number;

  @Prop()
  startedAt?: Date;

  @Prop()
  finishedAt?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type ServiceDocument = HydratedDocument<Service>;

export const ServiceSchema = SchemaFactory.createForClass(Service);
