import { Resolver, Query } from '@nestjs/graphql';
import { Patient } from './entities/patient.entity';
import { PatientService } from './patient.service';

@Resolver(() => Patient)
export class PatientResolver {
  constructor(private readonly patientService: PatientService) {}

  @Query(() => [Patient], { name: 'patients' })
  findAll() {
    return this.patientService.findAll();
  }

  @Query(() => Patient, { name: 'patient' })
  findOne() {
    return this.patientService.findOne();
  }
}