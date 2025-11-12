import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class SavedPatient {
  @Field()
  id: string;

  @Field()
  patientId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;
}

@ObjectType()
export class Hl7SaveResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => SavedPatient, { nullable: true })
  patient?: SavedPatient;
}