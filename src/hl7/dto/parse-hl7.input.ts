import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ParseHl7Input {
  @Field()
  message: string;
}