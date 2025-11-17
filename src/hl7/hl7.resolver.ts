import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Hl7Service } from './hl7.service';
import { Hl7ParsedData } from './entities/hl7-parsed.entity';
import { Hl7SaveResponse } from './entities/hl7-save-response.entity';
import { ParseHl7Input } from './dto/parse-hl7.input';
import { Hl7OruResponse } from './entities/hl7-oru-response.entity';
@Resolver()
export class Hl7Resolver {
  constructor(private readonly hl7Service: Hl7Service) {}

  @Mutation(() => Hl7ParsedData)
  parseHl7Message(@Args('input') input: ParseHl7Input) {
    return this.hl7Service.parseMessage(input.message);
  }

  @Mutation(() => Hl7SaveResponse)
  parseAndSaveHl7Message(@Args('input') input: ParseHl7Input) {
    return this.hl7Service.parseAndSaveMessage(input.message);
  }
    @Mutation(() => Hl7OruResponse)
  parseAndSaveHl7Results(@Args('input') input: ParseHl7Input) {
    return this.hl7Service.parseAndSaveResults(input.message);
  }
}