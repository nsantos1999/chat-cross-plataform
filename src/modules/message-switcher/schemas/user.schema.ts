import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRegisterStepsEnum } from '../constants/enums/user-register-steps.enum';

@Schema({ timestamps: true })
export class User {
  @Prop()
  name?: string;

  @Prop({ type: Boolean })
  isCustomer?: boolean;

  @Prop()
  phone: number;

  @Prop()
  cnpj?: number;

  @Prop({ enum: UserRegisterStepsEnum })
  registerStep: UserRegisterStepsEnum;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
