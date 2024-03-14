import axios from 'axios';

export class RequestUtils {
  static async getContentTypeFromLink(link: string): Promise<string> {
    const response = await axios.get(link);

    return response.headers['content-type'];
  }
}
