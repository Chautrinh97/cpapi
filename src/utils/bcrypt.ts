import * as bcrypt from 'bcryptjs';
export const hash = async (string: string) => bcrypt.hash(string, 10);

export const compare = async (str1: string, str2: string) =>
  bcrypt.compare(str1, str2);
