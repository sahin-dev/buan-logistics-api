import { Controller, Get, Version } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }


  @Get()
  @Version('2')
  getHelloV2(): string {
    return this.appService.getHelloV2();
  }
}
