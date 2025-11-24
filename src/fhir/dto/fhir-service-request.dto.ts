export class FhirServiceRequest {
  resourceType: string;
  id?: string;
  identifier?: Array<{
    system?: string;
    value: string;
  }>;
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  code?: {
    coding?: Array<{
      system?: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  authoredOn?: string;
  requester?: {
    reference?: string;
    display?: string;
  };
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
}