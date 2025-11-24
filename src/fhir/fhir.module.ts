import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FhirPatientController } from './controller/fhir.controller';
import { FhirTransformerService } from './fhir-transformer/fhir-transformer.service';
import { FhirObservationController } from './controller/fhir-observation.controller';
import { FhirServiceRequestController } from './controller/fhir-service-request.controller';

@Module({
  imports: [PrismaModule],
  providers: [FhirTransformerService],
  controllers: [FhirPatientController, FhirObservationController , FhirServiceRequestController],
  exports: [FhirTransformerService],
})
export class FhirModule {}