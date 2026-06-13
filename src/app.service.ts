import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHelloV2(): string {
    return 'Hello World! This is version 2';
  }
}
