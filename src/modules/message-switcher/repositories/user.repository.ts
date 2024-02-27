import { InjectModel } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';
import { Model } from 'mongoose';

export class UserRepository {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  findByPhone(phone: number) {
    return this.userModel.findOne({ phone });
  }

  create(user: User) {
    return this.userModel.create(user);
  }

  updateByPhone(phone: number, user: Partial<User>) {
    return this.userModel.updateOne({ phone }, user);
  }
}
