import { IsString, Length } from 'class-validator';

export class OrderNumberParamDto {
  @IsString()
  @Length(1, 50)
  orderNumber!: string;
}
