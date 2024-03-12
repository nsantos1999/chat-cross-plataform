import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Service } from './service.schema';

@Schema({ timestamps: true })
export class ServiceAttendantsHistories {
  @Prop({ type: Types.ObjectId, ref: Service.name })
  service: Service;

  @Prop()
  attendantId: string;

  @Prop()
  attendantName: string;

  @Prop()
  attendantAadObjectId?: string;

  @Prop()
  sector: string;

  @Prop()
  round: number;

  @Prop()
  isActual: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type ServiceAttendantsHistoriesDocument =
  HydratedDocument<ServiceAttendantsHistories>;

export const ServiceAttendantsHistoriesSchema = SchemaFactory.createForClass(
  ServiceAttendantsHistories,
);
