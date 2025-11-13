import { Injectable } from '@nestjs/common';
import { FhirPatient } from '../dto/fhir-patient.dto';

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
          value: patient.patientId
        }
      ],
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: patient.middleName 
            ? [patient.firstName, patient.middleName]
            : [patient.firstName]
        }
      ],
      gender: this.mapGender(patient.gender),
      birthDate: this.formatDate(patient.dateOfBirth),
      meta: {
        versionId: '1',
        lastUpdated: patient.updatedAt?.toISOString() || new Date().toISOString()
      }
    };

    // Add address if available
    if (patient.street || patient.city || patient.state) {
      fhirPatient.address = [
        {
          use: 'home',
          line: patient.street ? [patient.street] : [],
          city: patient.city || '',
          state: patient.state || '',
          postalCode: patient.zipCode || ''
        }
      ];
    }

    // Add phone if available
    if (patient.phoneNumber) {
      fhirPatient.telecom = [
        {
          system: 'phone',
          value: patient.phoneNumber,
          use: 'home'
        }
      ];
    }

    return fhirPatient;
  }

  // Convert FHIR Patient to our database format
  fromFhirPatient(fhirPatient: FhirPatient): any {
    const name = fhirPatient.name?.[0];
    const address = fhirPatient.address?.[0];
    const phone = fhirPatient.telecom?.find(t => t.system === 'phone');
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
      phoneNumber: phone?.value || null
    };
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