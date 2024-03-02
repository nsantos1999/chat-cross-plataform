export interface MessagerServiceOption {
  id: string | number;
  title: string;
}

export interface MessagerService {
  sendMessage(
    id: string,
    text: string,
    options?: MessagerServiceOption[],
  ): Promise<void>;
  receiveMessage(id: string, text: string): Promise<void>;
}
