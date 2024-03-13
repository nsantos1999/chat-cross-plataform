import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

import { ConfidentialClientApplication } from '@azure/msal-node';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserStatus } from '../constants/enums/user-status.enum';
import { GetUsersStatusDto } from '../dtos/get-users-status.dto';
import { GroupMember } from '../@types/group-member.types';

@Injectable()
export class MSTeamsApiGraphService {
  private readonly baseGraphApi = `https://graph.microsoft.com/v1.0`;
  private apiGraph: AxiosInstance;

  private msalClient: ConfidentialClientApplication;

  constructor(private readonly configService: ConfigService) {
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: this.configService.get('OAUTH_AZURE_APP_ID'),
        clientSecret: this.configService.get('OAUTH_AZURE_APP_SECRET'),
      },
    });

    this.generateTokenAndRegistrationNewToken();

    this.apiGraph = axios.create({
      baseURL: this.baseGraphApi,
    });
  }

  async getUsers() {
    try {
      // const { data } = await this.apiGraph.get(
      //   `/groups/03a4da3d-435d-471b-8f71-16771203e9a9/members`,
      // );
      // 9a5ca47c-031b-44d6-a3fc-2e4580409cb2 - testeexpanso@rmfarma.com.br
      // a2dc799a-885c-4afa-89b3-e44c738bef60 - testeatendimento@rmfarma.com.br
      // const { data } = await this.apiGraph.get(
      //   `/groups/a2dc799a-885c-4afa-89b3-e44c738bef60/members`,
      // );

      const { data } = await this.apiGraph.get(
        `/users/c3b85288-6ddd-46d1-bc02-baccb8cc8c58/presence`,
      );

      // console.log(data.value.length);
      return data;
    } catch (err) {
      console.log(err.response.data);
      throw new InternalServerErrorException(
        `Não foi possivel buscar usuarios`,
      );
    }
  }

  async getGroupMembers(groupId: string) {
    try {
      const { data } = await this.apiGraph.get<{ value: GroupMember[] }>(
        `/groups/${groupId}/members`,
      );

      // console.log(data.value.length);
      return data.value;
    } catch (err) {
      console.log(err.response.data);

      return [];
      // throw new InternalServerErrorException(
      //   `Não foi possivel buscar usuarios`,
      // );
    }
  }

  async getUserStatus(userId: string): Promise<UserStatus> {
    try {
      const { data } = await this.apiGraph.get(`/users/${userId}/presence`);

      return data.availability;
    } catch (err) {
      console.log(err.response.data);
      return UserStatus.BUSY;
    }
  }

  async getUsersStatus(usersIds: string[]): Promise<GetUsersStatusDto[]> {
    try {
      const { data } = await this.apiGraph.post(
        `/communications/getPresencesByUserId`,
        {
          ids: usersIds,
        },
      );
      return data.value;
    } catch (err) {
      console.log(err.response.data);
      return usersIds.map((userId) => ({
        id: userId,
        availability: UserStatus.BUSY,
      }));
    }
  }

  private async generateTokenAndRegistrationNewToken() {
    const token = await this.msalClient.acquireTokenByClientCredential({
      authority: `https://login.microsoftonline.com/${this.configService.get('OAUTH_AZURE_APP_TENANT_ID')}`,
      scopes: ['https://graph.microsoft.com/.default'],
    });

    console.log(token);
    this.apiGraph.defaults.headers['Authorization'] =
      `Bearer ${token.accessToken}`;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  private refreshTokenCron() {
    this.generateTokenAndRegistrationNewToken();
  }
}
