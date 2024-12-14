// import { Injectable } from '@nestjs/common';
// import { ForgotPassword } from './schemas/forgot-password.schema';
// import { DataSource, Repository } from 'typeorm';

// @Injectable()
// export class AuthRepository extends Repository<ForgotPassword> {
//   constructor(private dataSource: DataSource) {
//     super(ForgotPassword)
//   }

//   async create(forgotPasswordDto): Promise<ForgotPassword> {
//     const createdForgotPassword = new this.forgotPasswordModel(
//       forgotPasswordDto,
//     );
//     return await createdForgotPassword.save();
//   }

//   async findForgotPassword(email: string): Promise<ForgotPassword> {
//     return this.forgotPasswordModel.findOne({ email: email }).exec();
//   }

//   async updateOne(email: string, data: any) {
//     this.forgotPasswordModel.updateOne({ email: email }, { $set: data }).exec();
//   }

//   async deleteForgotPassword(email: string) {
//     await this.forgotPasswordModel.deleteOne({ email: email });
//   }
// }
