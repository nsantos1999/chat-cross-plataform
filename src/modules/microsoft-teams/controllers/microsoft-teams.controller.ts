import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'botbuilder';
import { MicrosoftTeamsService } from '../service/microsoft-teams.service';
import { MSTeamsService } from '../service/ms-teams.service';

@Controller('teams')
export class MicrosoftTeamsController {
  constructor(
    private readonly microsoftTeamsService: MicrosoftTeamsService,
    private readonly whatsApp2Service: MSTeamsService,
  ) {}

  @Post('message')
  async message(@Req() req: Request, @Res() res: Response) {
    await this.whatsApp2Service
      .getAdapter()
      .process(req, res, (context) => this.whatsApp2Service.run(context));
  }
}
