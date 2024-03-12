import { UserStatus } from '../constants/enums/user-status.enum';

export class GetUsersStatusDto {
  id: string;
  availability: UserStatus;
}
