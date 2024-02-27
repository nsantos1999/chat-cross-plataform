export interface MessagerService {
  sendMessage(id: string, text: string): Promise<void>;
  receiveMessage(id: string, text: string): Promise<void>;
}
