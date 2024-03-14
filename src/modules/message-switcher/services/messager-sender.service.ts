export interface MessagerServiceOption {
  id: string | number;
  title: string;
}

export interface SendMessageParams {
  id: string;
  text: string;
  options?: MessagerServiceOption[];
  attachments?: Buffer[] | string[];
}
export interface ReceiveMessageParams {
  id: string;
  message: string;
  attachments?: Buffer[] | string[];
}

export interface MessagerService {
  sendMessage(sendMessageParams: SendMessageParams): Promise<void>;
  sendFile(id: string, file: File): Promise<void>;
  receiveMessage(params: ReceiveMessageParams): Promise<void>;
}
