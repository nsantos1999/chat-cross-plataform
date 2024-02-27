import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MicrosoftTeamsModule } from './modules/microsoft-teams/microsoft-teams.module';
import { ConfigModule } from '@nestjs/config';
import { MessageSwitcherModule } from './modules/message-switcher/message-switcher.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    WhatsAppModule,
    MicrosoftTeamsModule,
    MessageSwitcherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
