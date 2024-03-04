import { InjectModel } from '@nestjs/mongoose';
import { Message } from '../schemas/message.schema';
import { Model } from 'mongoose';

export class MessageRepository {
  constructor(
    @InjectModel(Message.name)
    private serviceModel: Model<Message>,
  ) {}

  register(message: Message) {
    return this.serviceModel.create(message);
  }
}
