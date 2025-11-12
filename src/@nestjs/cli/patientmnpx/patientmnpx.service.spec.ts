import { Test, TestingModule } from '@nestjs/testing';
import { PatientmnpxService } from './patientmnpx.service';

describe('PatientmnpxService', () => {
  let service: PatientmnpxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatientmnpxService],
    }).compile();

    service = module.get<PatientmnpxService>(PatientmnpxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
