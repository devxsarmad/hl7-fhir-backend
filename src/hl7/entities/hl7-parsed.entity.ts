import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class MessageHeader {
  @Field()
  segmentType: string;

  @Field()
  sendingApplication: string;

  @Field()
  sendingFacility: string;

  @Field()
  messageDateTime: string;

  @Field()
  messageType: string;

  @Field()
  messageControlId: string;
}

@ObjectType()
class PatientAddress {
  @Field()
  street: string;

  @Field()
  city: string;

  @Field()
  state: string;

  @Field()
  zipCode: string;
}

@ObjectType()
class Hl7Patient {  // ← Changed from "Patient" to "Hl7Patient"
  @Field()
  segmentType: string;

  @Field()
  patientId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  dateOfBirth: string;

  @Field()
  gender: string;

  @Field(() => PatientAddress)
  address: PatientAddress;

  @Field({ nullable: true })
  phoneNumber?: string;
}

@ObjectType()
class Order {
  @Field()
  segmentType: string;

  @Field()
  orderControl: string;

  @Field()
  placerOrderNumber: string;

  @Field()
  orderDateTime: string;
}

@ObjectType()
class ObservationIdentifier {
  @Field()
  code: string;

  @Field()
  text: string;

  @Field()
  codingSystem: string;
}

@ObjectType()
class OrderingProvider {
  @Field()
  id: string;

  @Field()
  lastName: string;

  @Field()
  firstName: string;
}

@ObjectType()
class Observation {
  @Field()
  segmentType: string;

  @Field()
  setId: string;

  @Field()
  placerOrderNumber: string;

  @Field(() => ObservationIdentifier)
  observationIdentifier: ObservationIdentifier;

  @Field()
  observationDateTime: string;

  @Field(() => OrderingProvider)
  orderingProvider: OrderingProvider;
}

@ObjectType()
export class Hl7ParsedData {
  @Field(() => MessageHeader, { nullable: true })
  messageHeader?: MessageHeader;

  @Field(() => Hl7Patient, { nullable: true })  // ← Changed here too
  patient?: Hl7Patient;  // ← And here

  @Field(() => Order, { nullable: true })
  order?: Order;

  @Field(() => Observation, { nullable: true })
  observation?: Observation;
}