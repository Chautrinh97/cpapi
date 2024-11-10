import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ForgotPassword } from './schemas/forgot-password.schema';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel('ForgotPassword')
    private readonly forgotPasswordModel: Model<ForgotPassword>,
  ) {}

  async create(forgotPasswordDto): Promise<ForgotPassword> {
    const createdForgotPassword = new this.forgotPasswordModel(
      forgotPasswordDto,
    );
    return await createdForgotPassword.save();
  }

  async findForgotPassword(email: string): Promise<ForgotPassword> {
    return this.forgotPasswordModel.findOne({ email: email }).exec();
  }

  async updateOne(email: string, data: any) {
    this.forgotPasswordModel.updateOne({ email: email }, { $set: data }).exec();
  }

  async deleteForgotPassword(email: string) {
    await this.forgotPasswordModel.deleteOne({ email: email });
  }
}
