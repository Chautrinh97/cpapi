import { Injectable } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { Repository, DataSource, ILike, Not } from 'typeorm';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async getAll(query: PaginationQueryDto, userRequestId?: number) {
    const { searchKey, pageNumber, pageLimit, isExport, orderBy } = query;
    let whereConditions;
    if (userRequestId) {
      whereConditions = searchKey
        ? [
            {
              fullName: ILike(`%${searchKey}%`),
              role: Not('superadmin'),
              id: Not(userRequestId),
            },
            {
              email: ILike(`%${searchKey}%`),
              role: Not('superadmin'),
              id: Not(userRequestId),
            },
          ]
        : [{ role: Not('superadmin'), id: Not(userRequestId) }];
    } else {
      whereConditions = searchKey
        ? [
            { fullName: ILike(`%${searchKey}%`), role: Not('superadmin') },
            { email: ILike(`%${searchKey}%`), role: Not('superadmin') },
          ]
        : [{ role: Not('superadmin') }];
    }

    const [field, order] = orderBy.split(' ');

    const skip = (pageNumber - 1) * pageLimit;
    const take = isExport ? undefined : pageLimit;

    const [users, total] = await this.findAndCount({
      where: whereConditions,
      relations: ['authorityGroup'],
      order: { [field]: order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC' },
      skip,
      take,
    });

    const sanitizedUsers = users.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...sanitizedUser } = user;
      return sanitizedUser;
    });

    return {
      data: sanitizedUsers,
      total,
      currentPage: pageNumber,
      numberOfPages: Math.ceil(total / pageLimit),
    };
  }
}
