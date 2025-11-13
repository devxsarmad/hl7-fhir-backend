import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FhirPatientController } from './controller/fhir.controller';
import { FhirTransformerService } from './fhir-transformer/fhir-transformer.service';

@Module({
  imports: [PrismaModule],
  providers: [FhirTransformerService],
  controllers: [FhirPatientController],
  exports: [FhirTransformerService],
})
export class FhirModule {}