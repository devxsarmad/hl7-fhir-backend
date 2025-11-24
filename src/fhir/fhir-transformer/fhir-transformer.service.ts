import { Injectable } from '@nestjs/common';
import { FhirPatient } from '../dto/fhir-patient.dto';
import { FhirObservation } from '../dto/fhir-observation.dto';
import { FhirServiceRequest } from '../dto/fhir-service-request.dto';

@Injectable()
export class FhirTransformerService {
  // Convert our database Patient to FHIR Patient
  toFhirPatient(patient: any): FhirPatient {
    const fhirPatient: FhirPatient = {
      resourceType: 'Patient',
      id: patient.id,
      identifier: [
        {
          system: 'http://hospital.com/patient-id',
          value: patient.patientId,
        },
      ],
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: patient.middleName
            ? [patient.firstName, patient.middleName]
            : [patient.firstName],
        },
      ],
      gender: this.mapGender(patient.gender),
      birthDate: this.formatDate(patient.dateOfBirth),
      meta: {
        versionId: '1',
        lastUpdated:
          patient.updatedAt?.toISOString() || new Date().toISOString(),
      },
    };

    // Add address if available
    if (patient.street || patient.city || patient.state) {
      fhirPatient.address = [
        {
          use: 'home',
          line: patient.street ? [patient.street] : [],
          city: patient.city || '',
          state: patient.state || '',
          postalCode: patient.zipCode || '',
        },
      ];
    }

    // Add phone if available
    if (patient.phoneNumber) {
      fhirPatient.telecom = [
        {
          system: 'phone',
          value: patient.phoneNumber,
          use: 'home',
        },
      ];
    }

    return fhirPatient;
  }

  // Convert FHIR Patient to our database format
  fromFhirPatient(fhirPatient: FhirPatient): any {
    const name = fhirPatient.name?.[0];
    const address = fhirPatient.address?.[0];
    const phone = fhirPatient.telecom?.find((t) => t.system === 'phone');
    const identifier = fhirPatient.identifier?.[0];

    return {
      patientId: identifier?.value || '',
      firstName: name?.given?.[0] || '',
      lastName: name?.family || '',
      middleName: name?.given?.[1] || null,
      gender: this.mapGenderFromFhir(fhirPatient.gender),
      dateOfBirth: fhirPatient.birthDate,
      street: address?.line?.[0] || null,
      city: address?.city || null,
      state: address?.state || null,
      zipCode: address?.postalCode || null,
      phoneNumber: phone?.value || null,
    };
  }

  toFhirObservation(observation: any, patient?: any): FhirObservation {
    const fhirObservation: FhirObservation = {
      resourceType: 'Observation',
      id: observation.id,
      status: this.mapResultStatus(observation.resultStatus),
      code: {
        coding: [
          {
            system: this.mapCodingSystem(observation.observationCodingSystem),
            code: observation.observationCode,
            display: observation.observationText,
          },
        ],
        text: observation.observationText,
      },
      subject: {
        reference: `Patient/${observation.order?.patientId || patient?.id || 'unknown'}`,
        display: patient
          ? `${patient.firstName} ${patient.lastName}`
          : undefined,
      },
      effectiveDateTime: this.formatDateTimeForFhir(
        observation.observationDateTime,
      ),
      issued: observation.updatedAt?.toISOString(),
      meta: {
        versionId: '1',
        lastUpdated:
          observation.updatedAt?.toISOString() || new Date().toISOString(),
      },
    };

    // Add value based on type
    if (observation.valueType === 'NM' && observation.value) {
      fhirObservation.valueQuantity = {
        value: parseFloat(observation.value),
        unit: observation.units,
        system: 'http://unitsofmeasure.org',
        code: observation.units,
      };
    } else {
      fhirObservation.valueString = observation.value;
    }

    // Add interpretation (Normal, High, Low)
    if (observation.abnormalFlags && observation.abnormalFlags !== 'N') {
      fhirObservation.interpretation = [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
              code: this.mapAbnormalFlag(observation.abnormalFlags),
              display: this.getAbnormalFlagDisplay(observation.abnormalFlags),
            },
          ],
        },
      ];
    }

    // Add reference range
    if (observation.referenceRangeLow || observation.referenceRangeHigh) {
      fhirObservation.referenceRange = [
        {
          low: observation.referenceRangeLow
            ? {
                value: parseFloat(observation.referenceRangeLow),
                unit: observation.units,
              }
            : undefined,
          high: observation.referenceRangeHigh
            ? {
                value: parseFloat(observation.referenceRangeHigh),
                unit: observation.units,
              }
            : undefined,
        },
      ];
    }

    return fhirObservation;
  }
  toFhirServiceRequest(order: any, patient?: any): FhirServiceRequest {
    const fhirServiceRequest: FhirServiceRequest = {
      resourceType: 'ServiceRequest',
      id: order.id,
      identifier: [
        {
          system: 'http://hospital.com/order-id',
          value: order.placerOrderNumber,
        },
      ],
      status: this.mapOrderStatus(order.orderControl),
      intent: 'order',
      subject: {
        reference: `Patient/${order.patientId}`,
        display: patient
          ? `${patient.firstName} ${patient.lastName}`
          : undefined,
      },
      authoredOn: this.formatDateTimeForFhir(order.orderDateTime),
      meta: {
        versionId: '1',
        lastUpdated: order.updatedAt?.toISOString() || new Date().toISOString(),
      },
    };

    // Add code if we can get it from related observations
    if (order.observations && order.observations.length > 0) {
      const firstObs = order.observations[0];
      fhirServiceRequest.code = {
        coding: [
          {
            system: this.mapCodingSystem(firstObs.observationCodingSystem),
            code: firstObs.observationCode,
            display: firstObs.observationText,
          },
        ],
        text: firstObs.observationText,
      };
    }

    return fhirServiceRequest;
  }

  // NEW: Convert FHIR ServiceRequest to database Order
  fromFhirServiceRequest(fhirServiceRequest: FhirServiceRequest): any {
    const patientRef = fhirServiceRequest.subject.reference;
    const patientId = patientRef.replace('Patient/', '');

    return {
      placerOrderNumber:
        fhirServiceRequest.identifier?.[0]?.value || `SR-${Date.now()}`,
      orderControl: this.mapStatusToOrderControl(fhirServiceRequest.status),
      orderDateTime:
        fhirServiceRequest.authoredOn ||
        new Date().toISOString().split('T')[0].replace(/-/g, ''),
      patientId: patientId,
    };
  }

  // Helper: Map order control to FHIR status
  private mapOrderStatus(
    orderControl: string,
  ):
    | 'draft'
    | 'active'
    | 'on-hold'
    | 'revoked'
    | 'completed'
    | 'entered-in-error'
    | 'unknown' {
    switch (orderControl?.toUpperCase()) {
      case 'NW': // New order
      case 'SC': // Status changed
        return 'active';
      case 'CA': // Cancel
        return 'revoked';
      case 'DC': // Discontinue
        return 'revoked';
      case 'RE': // Results
      case 'CM': // Complete
        return 'completed';
      case 'HD': // Hold
        return 'on-hold';
      default:
        return 'active';
    }
  }

  // Helper: Map FHIR status to order control
  private mapStatusToOrderControl(status: string): string {
    switch (status) {
      case 'active':
        return 'NW';
      case 'completed':
        return 'CM';
      case 'revoked':
        return 'CA';
      case 'on-hold':
        return 'HD';
      default:
        return 'NW';
    }
  }
  // Helper: Map result status to FHIR status
  private mapResultStatus(
    status: string,
  ):
    | 'registered'
    | 'preliminary'
    | 'final'
    | 'amended'
    | 'corrected'
    | 'cancelled' {
    switch (status?.toUpperCase()) {
      case 'F':
        return 'final';
      case 'P':
        return 'preliminary';
      case 'C':
        return 'corrected';
      case 'X':
        return 'cancelled';
      default:
        return 'final';
    }
  }

  // Helper: Map coding system
  private mapCodingSystem(system: string): string {
    switch (system?.toUpperCase()) {
      case 'LN':
      case 'LOINC':
        return 'http://loinc.org';
      case 'SCT':
      case 'SNOMED':
        return 'http://snomed.info/sct';
      default:
        return 'http://loinc.org';
    }
  }

  // Helper: Map abnormal flags
  private mapAbnormalFlag(flag: string): string {
    switch (flag?.toUpperCase()) {
      case 'H':
      case 'HH':
        return 'H'; // High
      case 'L':
      case 'LL':
        return 'L'; // Low
      case 'A':
        return 'A'; // Abnormal
      case 'N':
      default:
        return 'N'; // Normal
    }
  }

  // Helper: Get display text for abnormal flags
  private getAbnormalFlagDisplay(flag: string): string {
    switch (flag?.toUpperCase()) {
      case 'H':
        return 'High';
      case 'HH':
        return 'Critical High';
      case 'L':
        return 'Low';
      case 'LL':
        return 'Critical Low';
      case 'A':
        return 'Abnormal';
      case 'N':
      default:
        return 'Normal';
    }
  }

  // Helper: Format datetime for FHIR
  private formatDateTimeForFhir(datetime: string): string {
    if (!datetime) return new Date().toISOString();

    // If already ISO format, return as-is
    if (datetime.includes('T')) {
      return datetime;
    }

    // If YYYYMMDDHHMMSS format, convert to ISO
    if (/^\d{14}$/.test(datetime)) {
      const year = datetime.substring(0, 4);
      const month = datetime.substring(4, 6);
      const day = datetime.substring(6, 8);
      const hour = datetime.substring(8, 10);
      const minute = datetime.substring(10, 12);
      const second = datetime.substring(12, 14);
      return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }

    // If YYYYMMDD format, add time
    if (/^\d{8}$/.test(datetime)) {
      const year = datetime.substring(0, 4);
      const month = datetime.substring(4, 6);
      const day = datetime.substring(6, 8);
      return `${year}-${month}-${day}T00:00:00Z`;
    }

    return datetime;
  }

  // Helper: Map database gender to FHIR gender
  private mapGender(gender: string): 'male' | 'female' | 'other' | 'unknown' {
    switch (gender?.toUpperCase()) {
      case 'M':
      case 'MALE':
        return 'male';
      case 'F':
      case 'FEMALE':
        return 'female';
      default:
        return 'unknown';
    }
  }

  // Helper: Map FHIR gender to database gender
  private mapGenderFromFhir(gender: string): string {
    switch (gender) {
      case 'male':
        return 'M';
      case 'female':
        return 'F';
      default:
        return 'U';
    }
  }

  // Helper: Format date to YYYY-MM-DD
  private formatDate(date: string): string {
    if (!date) return '';

    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    // If in YYYYMMDD format (from HL7), convert to YYYY-MM-DD
    if (/^\d{8}$/.test(date)) {
      return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
    }

    return date;
  }
}
