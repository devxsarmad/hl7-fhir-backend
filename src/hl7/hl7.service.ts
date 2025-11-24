import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class Hl7Service {
  constructor(private prisma: PrismaService) {}

  async parseAndSaveMessage(hl7Message: string) {
    // Parse the message
    const parsedData = this.parseMessage(hl7Message);

    // Save to database
    if (parsedData.patient && parsedData.order && parsedData.observation) {
      // 1. Create or update patient
      const patient = await this.prisma.patient.upsert({
        where: { patientId: parsedData.patient.patientId },
        update: {
          firstName: parsedData.patient.firstName,
          lastName: parsedData.patient.lastName,
          middleName: parsedData.patient.middleName,
          dateOfBirth: parsedData.patient.dateOfBirth,
          gender: parsedData.patient.gender,
          street: parsedData.patient.address.street,
          city: parsedData.patient.address.city,
          state: parsedData.patient.address.state,
          zipCode: parsedData.patient.address.zipCode,
          phoneNumber: parsedData.patient.phoneNumber,
        },
        create: {
          patientId: parsedData.patient.patientId,
          firstName: parsedData.patient.firstName,
          lastName: parsedData.patient.lastName,
          middleName: parsedData.patient.middleName,
          dateOfBirth: parsedData.patient.dateOfBirth,
          gender: parsedData.patient.gender,
          street: parsedData.patient.address.street,
          city: parsedData.patient.address.city,
          state: parsedData.patient.address.state,
          zipCode: parsedData.patient.address.zipCode,
          phoneNumber: parsedData.patient.phoneNumber,
        },
      });

      // 2. Create or update order
      const order = await this.prisma.order.upsert({
        where: { placerOrderNumber: parsedData.order.placerOrderNumber },
        update: {
          orderControl: parsedData.order.orderControl,
          fillerOrderNumber: parsedData.order.fillerOrderNumber,
          orderDateTime: parsedData.order.orderDateTime,
          patientId: patient.id,
        },
        create: {
          orderControl: parsedData.order.orderControl,
          placerOrderNumber: parsedData.order.placerOrderNumber,
          fillerOrderNumber: parsedData.order.fillerOrderNumber,
          orderDateTime: parsedData.order.orderDateTime,
          patientId: patient.id,
        },
      });
      // 3. Create observation
      await this.prisma.observation.create({
        data: {
          setId: parsedData.observation.setId,
          observationCode: parsedData.observation.observationIdentifier.code,
          observationText: parsedData.observation.observationIdentifier.text,
          observationCodingSystem:
            parsedData.observation.observationIdentifier.codingSystem,
          observationDateTime: parsedData.observation.observationDateTime,
          orderingProviderId: parsedData.observation.orderingProvider.id,
          orderingProviderLastName:
            parsedData.observation.orderingProvider.lastName,
          orderingProviderFirstName:
            parsedData.observation.orderingProvider.firstName,
          orderId: order.id,
        },
      });

      return {
        success: true,
        message: 'HL7 message parsed and saved successfully',
        patient: patient,
      };
    }

    return {
      success: false,
      message: 'Incomplete HL7 message',
    };
  }

  parseMessage(hl7Message: string) {
    // Split message into segments (lines)
    const normalizedMessage = hl7Message.replace(/\\n/g, '\n');

    // Split message into segments (lines)
    const segments = normalizedMessage
      .split('\n')
      .filter((line) => line.trim());

    let parsedData: {
      messageHeader: any;
      patient: any;
      order: any;
      observation: any;
    } = {
      messageHeader: null,
      patient: null,
      order: null,
      observation: null,
    };

    segments.forEach((segment) => {
      const fields = segment.split('|');
      const segmentType = fields[0];

      switch (segmentType) {
        case 'MSH':
          parsedData.messageHeader = this.parseMSH(fields);
          break;
        case 'PID':
          parsedData.patient = this.parsePID(fields);
          break;
        case 'ORC':
          parsedData.order = this.parseORC(fields);
          break;
        case 'OBR':
          parsedData.observation = this.parseOBR(fields);
          break;
      }
    });

    return parsedData;
  }

  private parseMSH(fields: string[]) {
    return {
      segmentType: 'MSH',
      sendingApplication: fields[2],
      sendingFacility: fields[3],
      receivingApplication: fields[4],
      receivingFacility: fields[5],
      messageDateTime: fields[6],
      messageType: fields[8],
      messageControlId: fields[9],
      versionId: fields[11],
    };
  }

  private parsePID(fields: string[]) {
    const patientName = fields[5]?.split('^') || [];
    const patientAddress = fields[11]?.split('^') || [];

    return {
      segmentType: 'PID',
      patientId: fields[3],
      lastName: patientName[0] || '',
      firstName: patientName[1] || '',
      middleName: patientName[2] || '',
      dateOfBirth: fields[7],
      gender: fields[8],
      address: {
        street: patientAddress[0] || '',
        city: patientAddress[2] || '',
        state: patientAddress[3] || '',
        zipCode: patientAddress[4] || '',
      },
      phoneNumber: fields[13],
    };
  }

  private parseORC(fields: string[]) {
    return {
      segmentType: 'ORC',
      orderControl: fields[1],
      placerOrderNumber: fields[2],
      fillerOrderNumber: fields[3],
      orderDateTime: fields[9],
    };
  }

  private parseOBR(fields: string[]) {
    const observationIdentifier = fields[4]?.split('^') || [];
    const orderingProvider = fields[16]?.split('^') || [];

    return {
      segmentType: 'OBR',
      setId: fields[1],
      placerOrderNumber: fields[2],
      observationIdentifier: {
        code: observationIdentifier[0] || '',
        text: observationIdentifier[1] || '',
        codingSystem: observationIdentifier[2] || '',
      },
      observationDateTime: fields[7],
      orderingProvider: {
        id: orderingProvider[0] || '',
        lastName: orderingProvider[1] || '',
        firstName: orderingProvider[2] || '',
      },
    };
  }
  async parseAndSaveResults(hl7Message: string) {
    const parsedData = this.parseOruMessage(hl7Message);

    if (
      parsedData.patient &&
      parsedData.order &&
      parsedData.observations.length > 0
    ) {
      // 1. Upsert patient
      const patient = await this.prisma.patient.upsert({
        where: { patientId: parsedData.patient.patientId },
        update: {
          firstName: parsedData.patient.firstName,
          lastName: parsedData.patient.lastName,
          middleName: parsedData.patient.middleName,
          dateOfBirth: parsedData.patient.dateOfBirth,
          gender: parsedData.patient.gender,
          street: parsedData.patient.address.street,
          city: parsedData.patient.address.city,
          state: parsedData.patient.address.state,
          zipCode: parsedData.patient.address.zipCode,
          phoneNumber: parsedData.patient.phoneNumber,
        },
        create: {
          patientId: parsedData.patient.patientId,
          firstName: parsedData.patient.firstName,
          lastName: parsedData.patient.lastName,
          middleName: parsedData.patient.middleName,
          dateOfBirth: parsedData.patient.dateOfBirth,
          gender: parsedData.patient.gender,
          street: parsedData.patient.address.street,
          city: parsedData.patient.address.city,
          state: parsedData.patient.address.state,
          zipCode: parsedData.patient.address.zipCode,
          phoneNumber: parsedData.patient.phoneNumber,
        },
      });

      // 2. Find or create order with proper datetime handling
      const orderDateTime =
        parsedData.order.observationDateTime ||
        parsedData.messageHeader?.messageDateTime ||
        new Date().toISOString().split('T')[0].replace(/-/g, '');

      const order = await this.prisma.order.upsert({
        where: { placerOrderNumber: parsedData.order.placerOrderNumber },
        update: {
          // Update if exists (maybe update datetime or status)
          orderDateTime: orderDateTime,
        },
        create: {
          // Create if doesn't exist
          orderControl: 'RE',
          placerOrderNumber: parsedData.order.placerOrderNumber,
          fillerOrderNumber: parsedData.order.fillerOrderNumber || null,
          orderDateTime: orderDateTime,
          patientId: patient.id,
        },
      });

      // 3. Save all observations (results)
      for (const obs of parsedData.observations) {
        await this.prisma.observation.upsert({
          where: {
            orderId_setId: {
              orderId: order.id,
              setId: obs.setId,
            },
          },
          update: {
            observationCode: obs.code,
            observationText: obs.text,
            observationCodingSystem: obs.codingSystem,
            observationDateTime: orderDateTime,
            valueType: obs.valueType,
            value: obs.value,
            units: obs.units,
            referenceRangeLow: obs.referenceRangeLow,
            referenceRangeHigh: obs.referenceRangeHigh,
            abnormalFlags: obs.abnormalFlags,
            resultStatus: obs.resultStatus,
          },
          create: {
            setId: obs.setId,
            observationCode: obs.code,
            observationText: obs.text,
            observationCodingSystem: obs.codingSystem,
            observationDateTime: orderDateTime,
            valueType: obs.valueType,
            value: obs.value,
            units: obs.units,
            referenceRangeLow: obs.referenceRangeLow,
            referenceRangeHigh: obs.referenceRangeHigh,
            abnormalFlags: obs.abnormalFlags,
            resultStatus: obs.resultStatus,
            orderId: order.id,
          },
        });
      }

      return {
        success: true,
        message: `HL7 ORU parsed: ${parsedData.observations.length} results saved`,
        patient: patient,
        resultCount: parsedData.observations.length,
      };
    }

    return {
      success: false,
      message: 'Incomplete HL7 ORU message',
    };
  }
  // Parse ORU message structure
  parseOruMessage(hl7Message: string) {
    const normalizedMessage = hl7Message.replace(/\\n/g, '\n');
    const segments = normalizedMessage
      .split('\n')
      .filter((line) => line.trim());

    const parsedData: any = {
      messageHeader: null,
      patient: null,
      order: null,
      observations: [],
    };

    segments.forEach((segment) => {
      const fields = segment.split('|');
      const segmentType = fields[0];

      switch (segmentType) {
        case 'MSH':
          parsedData.messageHeader = this.parseMSH(fields);
          break;
        case 'PID':
          parsedData.patient = this.parsePID(fields);
          break;
        case 'OBR':
          parsedData.order = this.parseOBR(fields);
          break;
        case 'OBX':
          parsedData.observations.push(this.parseOBX(fields));
          break;
      }
    });

    return parsedData;
  }

  // Parse OBX segment
  private parseOBX(fields: string[]) {
    const observationIdentifier = fields[3]?.split('^') || [];
    const referenceRange = fields[7]?.split('-') || [];
    return {
      setId: fields[1] || '',
      valueType: fields[2] || 'NM', // NM=Numeric, ST=String, TX=Text
      code: observationIdentifier[0] || '',
      text: observationIdentifier[1] || '',
      codingSystem: observationIdentifier[2] || 'LN', // LN=LOINC
      value: fields[5] || '',
      units: fields[6] || '',
      referenceRangeLow: referenceRange[0] || null,
      referenceRangeHigh: referenceRange[1] || null,
      abnormalFlags: fields[8] || 'N', // N=Normal, H=High, L=Low
      resultStatus: fields[11] || 'F', // F=Final, P=Preliminary
    };
  }
}
