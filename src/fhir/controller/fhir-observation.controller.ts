import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FhirTransformerService } from '../fhir-transformer/fhir-transformer.service';
import { FhirObservation } from '../dto/fhir-observation.dto';


@Controller('fhir')
export class FhirObservationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhirTransformer: FhirTransformerService,
  ) {}

  // READ: Get observation by ID
  // GET /fhir/Observation/:id
  @Get('Observation/:id')
  async getObservation(@Param('id') id: string): Promise<FhirObservation> {
    const observation = await this.prisma.observation.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            patient: true,
          }
        }
      }
    });

    if (!observation) {
      throw new HttpException(
        {
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'not-found',
            diagnostics: `Observation with id ${id} not found`
          }]
        },
        HttpStatus.NOT_FOUND
      );
    }

    return this.fhirTransformer.toFhirObservation(
      observation,
      observation.order?.patient
    );
  }

  // SEARCH: Search observations
  // GET /fhir/Observation?patient=123&code=WBC&date=2023-11-13
  @Get('Observation')
  async searchObservations(
    @Query('patient') patientId?: string,
    @Query('subject') subjectId?: string,
    @Query('code') code?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('_count') count?: string,
  ) {
    const where: any = {};
    const take = count ? parseInt(count) : 20;

    // Search by patient
    if (patientId || subjectId) {
      const pid = patientId || subjectId;
      where.order = {
        patient: {
          id: pid,
        }
      };
    }

    // Search by observation code
    if (code) {
      where.observationCode = { contains: code, mode: 'insensitive' };
    }

    // Search by date
    if (date) {
      where.observationDateTime = { contains: date };
    }

    // Search by status
    if (status) {
      const statusMap: any = {
        'final': 'F',
        'preliminary': 'P',
        'corrected': 'C',
      };
      where.resultStatus = statusMap[status] || status;
    }

    const observations = await this.prisma.observation.findMany({
      where,
      take,
      include: {
        order: {
          include: {
            patient: true,
          }
        }
      },
      orderBy: {
        observationDateTime: 'desc',
      }
    });

    // FHIR Bundle format for search results
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: observations.length,
      entry: observations.map(observation => ({
        fullUrl: `http://localhost:3000/fhir/Observation/${observation.id}`,
        resource: this.fhirTransformer.toFhirObservation(
          observation,
          observation.order?.patient
        )
      }))
    };
  }

  // CREATE: Create new observation (for completeness)
  // POST /fhir/Observation
  @Post('Observation')
  async createObservation(@Body() fhirObservation: FhirObservation) {
    // Extract patient reference
    const patientRef = fhirObservation.subject.reference;
    const patientId = patientRef.replace('Patient/', '');

    // For now, we'll create a simple observation
    // In production, you'd want more validation and order linking
    const observation = await this.prisma.observation.create({
      data: {
        setId: '1',
        observationCode: fhirObservation.code.coding?.[0]?.code || '',
        observationText: fhirObservation.code.text || '',
        observationCodingSystem: 'LN',
        observationDateTime: fhirObservation.effectiveDateTime || new Date().toISOString(),
        valueType: fhirObservation.valueQuantity ? 'NM' : 'ST',
        value: fhirObservation.valueQuantity?.value?.toString() || fhirObservation.valueString || '',
        units: fhirObservation.valueQuantity?.unit || null,
        resultStatus: fhirObservation.status === 'final' ? 'F' : 'P',
        order: {
          create: {
            orderControl: 'NW',
            placerOrderNumber: `OBS-${Date.now()}`,
            orderDateTime: new Date().toISOString().split('T')[0].replace(/-/g, ''),
            patientId: patientId,
          }
        }
      },
      include: {
        order: {
          include: {
            patient: true,
          }
        }
      }
    });

    return this.fhirTransformer.toFhirObservation(observation, observation.order?.patient);
  }
}