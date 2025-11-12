import { Module } from '@nestjs/common';
import { Hl7Service } from './hl7.service';
import { Hl7Resolver } from './hl7.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [Hl7Service, Hl7Resolver],
  exports: [Hl7Service],
})
export class Hl7Module {}