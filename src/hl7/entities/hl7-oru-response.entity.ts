import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
class SavedPatientSimple {
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
export class Hl7OruResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => SavedPatientSimple, { nullable: true })
  patient?: SavedPatientSimple;

  @Field(() => Int, { nullable: true })
  resultCount?: number;
}