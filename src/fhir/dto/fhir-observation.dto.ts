export class FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export class FhirCoding {
  system?: string;
  code: string;
  display?: string;
}

export class FhirQuantity {
  value: number;
  unit?: string;
  system?: string;
  code?: string;
}

export class FhirReference {
  reference: string;
  display?: string;
}

export class FhirReferenceRange {
  low?: FhirQuantity;
  high?: FhirQuantity;
  text?: string;
}

export class FhirObservation {
  resourceType: string;
  id?: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled';
  code: FhirCodeableConcept;
  subject: FhirReference;
  effectiveDateTime?: string;
  issued?: string;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  interpretation?: FhirCodeableConcept[];
  referenceRange?: FhirReferenceRange[];
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
}