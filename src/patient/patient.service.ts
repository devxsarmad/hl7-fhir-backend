import { Injectable } from '@nestjs/common';

@Injectable()
export class PatientService {
  findAll() {
    // Temporary mock data
    return [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'M',
      },
    ];
  }

  findOne() {
    return {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'M',
    };
  }
}