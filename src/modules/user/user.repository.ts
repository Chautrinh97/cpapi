import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';

@Injectable()
export class UserRepository {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  async create(createUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return await createdUser.save();
  }

  async getAll(vendorId, query: PaginationQueryDto) {
    const { searchKey, pageNumber, pageLimit, isExport, orderBy } = query;
    const filters: FilterQuery<User> = {
      vendorId: vendorId,
      role: 'employee',
    };

    if (searchKey) {
      filters.$or = [
        { fullName: new RegExp(searchKey, 'i') },
        { email: new RegExp(searchKey, 'i') },
      ];
    }

    const [field, order] = orderBy.split(' ');

    const users = this.userModel
      .find(filters)
      .sort({ [field]: order === 'asc' ? 1 : -1 });

    const total = await this.userModel.countDocuments(filters);

    if (isExport) {
      const result = await users.exec();
      return {
        data: result,
        total: total,
        currentPage: 1,
        numberOfPages: 1,
      };
    }

    const result = await users
      .skip(pageLimit * (pageNumber - 1))
      .limit(pageLimit)
      .exec();
    return {
      data: result,
      total: total,
      currentPage: pageNumber,
      numberOfPages: Math.ceil(total / pageLimit),
    };
  }

  async findOne(filter): Promise<User> {
    return this.userModel.findOne(filter).exec();
  }

  async findMany(filter) {
    return this.userModel.find(filter).exec();
  }

  async updateOne(filter, updateUserDto) {
    this.userModel.updateOne({ ...filter }, { $set: updateUserDto }).exec();
  }

  async updateMany(filter, data) {
    this.userModel.updateMany(filter, data).exec();
  }

  async findOneAndUpdate(filter, data: any) {
    return this.userModel
      .findOneAndUpdate({ ...filter }, { $set: data }, { new: true })
      .exec();
  }

  async deleteOne(filter) {
    await this.userModel.deleteOne(filter as FilterQuery<User>);
  }
}
