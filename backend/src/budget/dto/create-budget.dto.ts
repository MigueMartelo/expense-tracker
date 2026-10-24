import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100)
  name: string;
}
