import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'botbuilder';
import { MicrosoftTeamsService } from '../service/microsoft-teams.service';
import { MSTeamsService } from '../service/ms-teams.service';
import { MSTeamsApiGraphService } from '../service/ms-teams-api-graph.service';

@Controller('teams')
export class MicrosoftTeamsController {
  constructor(
    private readonly _: MicrosoftTeamsService,
    private readonly msTeamsService: MSTeamsService,
    private readonly msTeamsApiGraphService: MSTeamsApiGraphService,
  ) {}

  @Post('message')
  async message(@Req() req: Request, @Res() res: Response) {
    await this.msTeamsService
      .getAdapter()
      .process(req, res, (context) => this.msTeamsService.run(context));
  }

  @Get('users')
  async getUsers() {
    return await this.msTeamsApiGraphService.getUsers();
  }

  @Post('group')
  async createGroup() {
    const members = [
      {
        id: '28:8fe18cc0-1677-4d48-8f1d-58b83e5e6029',
        name: 'Bot',
      },
      {
        id: '29:1qHWJ7LvTVtaTimfNgt7Ywmz7w9AbRCCzQE5qnzQeRc0aInsdlA8CDAMlZ_xySvrvGQ5vc1troZn6Sdrf8YN0Ig',
        name: 'Natã Santos',
      },
    ];
    await this.msTeamsApiGraphService.createGroup(
      'Atendimento de Natã Souza',
      'Natã Souza Precisa de atendimento',
      members,
    );
  }
}
