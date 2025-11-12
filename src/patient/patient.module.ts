import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientResolver } from './patient.resolver';

@Module({
  providers: [PatientService, PatientResolver]
})
export class PatientModule {}
