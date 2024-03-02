import { MessagerServiceOption } from '../services/messager-sender.service';

export interface QuestionToRegister {
  question: string;
  options?: MessagerServiceOption[];
}
