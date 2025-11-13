export class FhirHumanName {
  use?: string;
  family: string;
  given: string[];
  prefix?: string[];
}

export class FhirAddress {
  use?: string;
  line: string[];
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export class FhirTelecom {
  system: string; // 'phone' | 'email' | 'fax'
  value: string;
  use?: string; // 'home' | 'work' | 'mobile'
}

export class FhirIdentifier {
  system: string;
  value: string;
}

export class FhirPatient {
  resourceType: string;
  id?: string;
  identifier?: FhirIdentifier[];
  name: FhirHumanName[];
  telecom?: FhirTelecom[];
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string; // YYYY-MM-DD format
  address?: FhirAddress[];
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
}