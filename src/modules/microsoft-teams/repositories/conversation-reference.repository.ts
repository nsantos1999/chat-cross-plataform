import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConversationReference } from '../schemas/conversation-reference.schema';
import { Model } from 'mongoose';

@Injectable()
export class ConversationReferenceRepository {
  constructor(
    @InjectModel(ConversationReference.name)
    private conversationReferenceModel: Model<ConversationReference>,
  ) {}

  async addNewIfNotFound(
    conversationReference: Partial<ConversationReference>,
  ) {
    const conversationReferenceFounded = await this.findByUser(
      conversationReference.user.id,
    );

    if (conversationReferenceFounded) {
      return conversationReferenceFounded;
    }

    return this.addNewConversationReference(conversationReference);
  }

  async addNewConversationReference(
    conversationReference: Partial<ConversationReference>,
  ) {
    return this.conversationReferenceModel.create(conversationReference);
  }

  async findByUser(userId: string) {
    return this.conversationReferenceModel.findOne({
      $or: [{ 'user.id': userId }, { 'user.aadObjectId': userId }],
    });
  }

  async findAll() {
    return this.conversationReferenceModel.find();
  }
}
