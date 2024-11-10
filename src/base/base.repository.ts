import { Model, Document, QueryOptions, FilterQuery } from 'mongoose';

export class BaseRepository<T extends Document> {
  constructor(private readonly model: Model<T>) {}
  async create(createDto) {
    const createdObject = new this.model(createDto);
    return await createdObject.save();
  }

  async findById(id: string, options?: QueryOptions) {
    return this.model.findById(id, options);
  }

  async findByCondition(filters) {
    return this.model.findOne(filters as FilterQuery<T>);
  }

  async getByCondition(filters, fields?, options?, populate?) {
    return this.model.find(filters, fields, options).populate(populate);
  }

  async updateOne(filters, updateDto) {
    this.model.updateOne(filters, updateDto).exec();
  }

  async updateMany(filters, updateDto, options?) {
    this.model.updateMany(filters, updateDto, options).exec();
  }

  async findByIdAndUpdate(id, updateDto, options?) {
    return this.model.findByIdAndUpdate(id, updateDto, options).exec();
  }

  async findOneAndUpdate(filters, updateDto, options?) {
    return this.model.findOneAndUpdate(filters, updateDto, options);
  }

  async deleteOne(filters, options?) {
    this.model.deleteOne(filters, options);
  }

  async deleteMany(filters, options) {
    this.model.deleteMany(filters, options);
  }
}
