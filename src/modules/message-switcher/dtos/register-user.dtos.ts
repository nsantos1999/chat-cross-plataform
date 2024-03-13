import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class RegisterUserCNPJDto {
  @Transform(({ value }) => value.replace(/\D/g, ''))
  @IsString({ message: 'CNPJ no formato incorreto' })
  @Length(14, 14, {
    message: 'CNPJ no formato incorreto',
  })
  cnpj: string;

  constructor(data?: RegisterUserCNPJDto) {
    if (data) {
      this.cnpj = data.cnpj;
    }
  }
}
