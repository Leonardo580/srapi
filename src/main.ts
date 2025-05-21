import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {join} from "path";
import {readFileSync} from "fs";
import {NestApplicationOptions} from "@nestjs/common";
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// process.env.NODE_EXTRA_CA_CERTS = join("ssl/cert.pem");
async function bootstrap() {
  const nestAppOptions: NestApplicationOptions = {
    httpsOptions: {
      key: readFileSync(join( "ssl/key.pem")),
      cert: readFileSync(join("ssl/cert.pem")),
    }
  }
  const app = await NestFactory.create(AppModule, nestAppOptions);
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
