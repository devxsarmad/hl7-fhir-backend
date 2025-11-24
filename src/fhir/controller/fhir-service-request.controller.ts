import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FhirTransformerService } from '../fhir-transformer/fhir-transformer.service';
import { FhirServiceRequest } from '../dto/fhir-service-request.dto';


@Controller('fhir')
export class FhirServiceRequestController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhirTransformer: FhirTransformerService,
  ) {}

  // READ: Get service request by ID
  // GET /fhir/ServiceRequest/:id
  @Get('ServiceRequest/:id')
  async getServiceRequest(@Param('id') id: string): Promise<FhirServiceRequest> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        patient: true,
        observations: true,
      }
    });

    if (!order) {
      throw new HttpException(
        {
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'not-found',
            diagnostics: `ServiceRequest with id ${id} not found`
          }]
        },
        HttpStatus.NOT_FOUND
      );
    }

    return this.fhirTransformer.toFhirServiceRequest(order, order.patient);
  }

  // SEARCH: Search service requests
  // GET /fhir/ServiceRequest?patient=123&status=active&code=CBC
  @Get('ServiceRequest')
  async searchServiceRequests(
    @Query('patient') patientId?: string,
    @Query('subject') subjectId?: string,
    @Query('status') status?: string,
    @Query('code') code?: string,
    @Query('authored') authoredOn?: string,
    @Query('_count') count?: string,
  ) {
    const where: any = {};
    const take = count ? parseInt(count) : 20;

    // Search by patient
    if (patientId || subjectId) {
      where.patientId = patientId || subjectId;
    }

    // Search by status
    if (status) {
      // Map FHIR status to order control
      const statusMap: any = {
        'active': ['NW', 'SC'],
        'completed': ['RE', 'CM'],
        'revoked': ['CA', 'DC'],
        'on-hold': ['HD'],
      };
      where.orderControl = { in: statusMap[status] || [status] };
    }

    // Search by date
    if (authoredOn) {
      where.orderDateTime = { contains: authoredOn.replace(/-/g, '') };
    }

    // Search by code (need to join with observations)
    if (code) {
      where.observations = {
        some: {
          observationCode: { contains: code, mode: 'insensitive' }
        }
      };
    }

    const orders = await this.prisma.order.findMany({
      where,
      take,
      include: {
        patient: true,
        observations: true,
      },
      orderBy: {
        orderDateTime: 'desc',
      }
    });

    // FHIR Bundle format for search results
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: orders.length,
      entry: orders.map(order => ({
        fullUrl: `http://localhost:3000/fhir/ServiceRequest/${order.id}`,
        resource: this.fhirTransformer.toFhirServiceRequest(order, order.patient)
      }))
    };
  }

  // CREATE: Create new service request
  // POST /fhir/ServiceRequest
  @Post('ServiceRequest')
  async createServiceRequest(@Body() fhirServiceRequest: FhirServiceRequest): Promise<FhirServiceRequest> {
    // Convert FHIR to database format
    const orderData = this.fhirTransformer.fromFhirServiceRequest(fhirServiceRequest);

    // Save to database
    const createdOrder = await this.prisma.order.create({
      data: orderData,
      include: {
        patient: true,
        observations: true,
      }
    });

    // Convert back to FHIR and return
    return this.fhirTransformer.toFhirServiceRequest(createdOrder, createdOrder.patient);
  }

  // UPDATE: Update existing service request
  // PUT /fhir/ServiceRequest/:id
  @Put('ServiceRequest/:id')
  async updateServiceRequest(
    @Param('id') id: string,
    @Body() fhirServiceRequest: FhirServiceRequest
  ): Promise<FhirServiceRequest> {
    // Check if order exists
    const existingOrder = await this.prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      throw new HttpException(
        {
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'not-found',
            diagnostics: `ServiceRequest with id ${id} not found`
          }]
        },
        HttpStatus.NOT_FOUND
      );
    }

    // Convert FHIR to database format
    const orderData = this.fhirTransformer.fromFhirServiceRequest(fhirServiceRequest);

    // Update in database
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: orderData,
      include: {
        patient: true,
        observations: true,
      }
    });

    // Convert back to FHIR and return
    return this.fhirTransformer.toFhirServiceRequest(updatedOrder, updatedOrder.patient);
  }

  // DELETE: Delete service request
  // DELETE /fhir/ServiceRequest/:id
  @Delete('ServiceRequest/:id')
  async deleteServiceRequest(@Param('id') id: string) {
    // Check if order exists
    const existingOrder = await this.prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      throw new HttpException(
        {
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'not-found',
            diagnostics: `ServiceRequest with id ${id} not found`
          }]
        },
        HttpStatus.NOT_FOUND
      );
    }

    // Delete from database
    await this.prisma.order.delete({
      where: { id }
    });

    // Return operation outcome
    return {
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'information',
        code: 'informational',
        diagnostics: `ServiceRequest ${id} deleted successfully`
      }]
    };
  }
}