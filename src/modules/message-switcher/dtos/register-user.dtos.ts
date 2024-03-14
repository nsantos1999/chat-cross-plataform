import { Transform } from 'class-transformer';
import { IsEnum, IsString, Length } from 'class-validator';
import { UserRegisterIsCustomerEnum } from '../constants/enums/user-register-is-customer.enum';

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

export class RegisterUserIsCustomerDto {
  @IsString({ message: 'Resposta inválida' })
  @IsEnum(UserRegisterIsCustomerEnum, { message: 'Resposta inválida' })
  isCustomer: UserRegisterIsCustomerEnum;

  constructor(data?: RegisterUserIsCustomerDto) {
    if (data) {
      this.isCustomer = data.isCustomer;
    }
  }
}
