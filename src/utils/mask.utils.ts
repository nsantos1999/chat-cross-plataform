import * as StringMask from 'string-mask';

export class MaskUtil {
  static formatCNPJ(cnpj: string) {
    const formatter = new StringMask('00.000.000/0000-00');

    return formatter.apply(cnpj);
  }
}
