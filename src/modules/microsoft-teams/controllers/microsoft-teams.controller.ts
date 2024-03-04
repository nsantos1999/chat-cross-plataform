import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'botbuilder';
import { MicrosoftTeamsService } from '../service/microsoft-teams.service';
import { MSTeamsService } from '../service/ms-teams.service';

@Controller('teams')
export class MicrosoftTeamsController {
  constructor(
    private readonly _: MicrosoftTeamsService,
    private readonly msTeamsService: MSTeamsService,
  ) {}

  @Post('message')
  async message(@Req() req: Request, @Res() res: Response) {
    await this.msTeamsService
      .getAdapter()
      .process(req, res, (context) => this.msTeamsService.run(context));
  }
}
