import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { BadRequestException } from '../middelwares/errorHandler';
import { RequestedQuery } from '~/interfaces/movieBody';

class APIFeatures<T extends ObjectLiteral> {
  constructor(
    private query: SelectQueryBuilder<T>,
    private queryString: RequestedQuery,
  ) {}

  filter(): this {
    const { genre, title } = this.queryString;

    if (genre) {
      this.query.andWhere(
        `EXISTS (SELECT 1 FROM json_each(${this.query.alias}.genres) WHERE json_each.value->>'name' LIKE :genre)`,
        { genre: `%${genre.toLowerCase()}%` },
      );
    }

    if (title) {
      this.query.andWhere(`${this.query.alias}.title LIKE :title`, {
        title: `%${title.toLowerCase()}%`,
      });
    }

    return this;
  }

  sort(): this {
    const { sort } = this.queryString;
    const allowedSorts = ['title', 'release_date'];

    if (sort && allowedSorts.includes(sort)) {
      this.query.orderBy(`${this.query.alias}.${sort}`, 'ASC');
    } else {
      this.query.orderBy(`${this.query.alias}.release_date`, 'DESC');
    }

    return this;
  }

  paginate(): this {
    const { page = 1, limit = 10 } = this.queryString;

    if (isNaN(page) || +page <= 0) {
      throw new BadRequestException(`Page:${page} must be a positive number`);
    }
    if (isNaN(limit) || +limit <= 0) {
      throw new BadRequestException(`Limit:${limit} must be a positive number`);
    }
    const skip = (+page - 1) * +limit;

    this.query.skip(skip).take(+limit);

    return this;
  }

  async getResults(): Promise<T[]> {
    const results = await this.query.getMany();

    return results;
  }
}

export default APIFeatures;
