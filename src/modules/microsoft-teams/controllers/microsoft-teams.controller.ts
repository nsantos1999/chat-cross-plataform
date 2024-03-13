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

  @Get('/group/members')
  async getGroupMembers() {
    // 9a5ca47c-031b-44d6-a3fc-2e4580409cb2 - testeexpanso@rmfarma.com.br
    // a2dc799a-885c-4afa-89b3-e44c738bef60 - testeatendimento@rmfarma.com.br
    return this.msTeamsApiGraphService.getGroupMembers(
      '9a5ca47c-031b-44d6-a3fc-2e4580409cb2',
    );
  }
}
