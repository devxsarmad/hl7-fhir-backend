import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FhirPatient } from '../dto/fhir-patient.dto';
import { FhirTransformerService } from '../fhir-transformer/fhir-transformer.service';


@Controller('fhir')
export class FhirPatientController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhirTransformer: FhirTransformerService,
  ) {}

  // READ: Get patient by ID
  // GET /fhir/Patient/:id
  @Get('Patient/:id')
  async getPatient(@Param('id') id: string): Promise<FhirPatient> {
    const patient = await this.prisma.patient.findUnique({
      where: { id }
    });

    if (!patient) {
      throw new HttpException(
        {
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'not-found',
            diagnostics: `Patient with id ${id} not found`
          }]
        },
        HttpStatus.NOT_FOUND
      );
    }

    return this.fhirTransformer.toFhirPatient(patient);
  }

  // SEARCH: Search patients
  // GET /fhir/Patient?name=John&gender=male
  @Get('Patient')
  async searchPatients(
    @Query('name') name?: string,
    @Query('given') given?: string,
    @Query('family') family?: string,
    @Query('gender') gender?: string,
    @Query('birthdate') birthdate?: string,
  ) {
    const where: any = {};

    if (given) {
      where.firstName = { contains: given, mode: 'insensitive' };
    }

    if (family) {
      where.lastName = { contains: family, mode: 'insensitive' };
    }

    if (name) {
      where.OR = [
        { firstName: { contains: name, mode: 'insensitive' } },
        { lastName: { contains: name, mode: 'insensitive' } }
      ];
    }

    if (gender) {
      const dbGender = gender.toLowerCase() === 'male' ? 'M' : 'F';
      where.gender = dbGender;
    }

    if (birthdate) {
      where.dateOfBirth = birthdate;
    }

    const patients = await this.prisma.patient.findMany({
      where,
      take: 20 // Limit to 20 results
    });

    // FHIR Bundle format for search results
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: patients.length,
      entry: patients.map(patient => ({
        fullUrl: `http://localhost:3000/fhir/Patient/${patient.id}`,
        resource: this.fhirTransformer.toFhirPatient(patient)
      }))
    };
  }

  // CREATE: Create new patient
  // POST /fhir/Patient
  @Post('Patient')
  async createPatient(@Body() fhirPatient: FhirPatient): Promise<FhirPatient> {
    // Convert FHIR to database format
    const patientData = this.fhirTransformer.fromFhirPatient(fhirPatient);

    // Save to database
    const createdPatient = await this.prisma.patient.create({
      data: patientData
    });

    // Convert back to FHIR and return
    return this.fhirTransformer.toFhirPatient(createdPatient);
  }

  // UPDATE: Update existing patient
  // PUT /fhir/Patient/:id
  @Put('Patient/:id')
  async updatePatient(
    @Param('id') id: string,
    @Body() fhirPatient: FhirPatient
  ): Promise<FhirPatient> {
    // Check if patient exists
    const existingPatient = await this.prisma.patient.findUnique({
      where: { id }
    });

    if (!existingPatient) {
      throw new HttpException(
        {
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'not-found',
            diagnostics: `Patient with id ${id} not found`
          }]
        },
        HttpStatus.NOT_FOUND
      );
    }

    // Convert FHIR to database format
    const patientData = this.fhirTransformer.fromFhirPatient(fhirPatient);

    // Update in database
    const updatedPatient = await this.prisma.patient.update({
      where: { id },
      data: patientData
    });

    // Convert back to FHIR and return
    return this.fhirTransformer.toFhirPatient(updatedPatient);
  }

  // DELETE: Delete patient
  // DELETE /fhir/Patient/:id
  @Delete('Patient/:id')
  async deletePatient(@Param('id') id: string) {
    // Check if patient exists
    const existingPatient = await this.prisma.patient.findUnique({
      where: { id }
    });

    if (!existingPatient) {
      throw new HttpException(
        {
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'not-found',
            diagnostics: `Patient with id ${id} not found`
          }]
        },
        HttpStatus.NOT_FOUND
      );
    }

    // Delete from database
    await this.prisma.patient.delete({
      where: { id }
    });

    // Return operation outcome
    return {
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'information',
        code: 'informational',
        diagnostics: `Patient ${id} deleted successfully`
      }]
    };
  }
}