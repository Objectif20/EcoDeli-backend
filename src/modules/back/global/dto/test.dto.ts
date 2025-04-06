import { ApiProperty } from '@nestjs/swagger';

export class TestDto {
  @ApiProperty({ example: 30, description: 'The age of the test entity' })
  age: number;

  @ApiProperty({ example: 'John Doe', description: 'The name of the test entity' })
  name: string;
}
