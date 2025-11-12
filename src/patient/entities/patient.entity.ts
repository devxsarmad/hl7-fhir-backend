import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Patient {
  @Field(() => ID)
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field({ nullable: true })
  dateOfBirth?: string;

  @Field({ nullable: true })
  gender?: string;
}