export class BaseService {
    constructor(repository, model = null) {
        this.repository = repository;
        this.model = model;
    }

    async getAll(filters = {}, options = {}) {
        const result = await this.repository.findAll(filters, options);
        return {
            data: this.model ? result.data.map(item => new this.model(item)) : result.data,
            count: result.count
        };
    }

    async getById(id) {
        const data = await this.repository.findById(id);
        if (!data) return null;
        return this.model ? new this.model(data) : data;
    }

    async create(data) {
        if (this.model) {
            const entity = new this.model(data);
            const errors = entity.validate();
            if (errors.length > 0) {
                throw new ValidationError('Validation failed', errors);
            }
            data = entity.toDatabase();
        }

        const result = await this.repository.create(data);
        return this.model ? new this.model(result) : result;
    }

    async update(id, data) {
        if (this.model) {
            const existing = await this.getById(id);
            if (!existing) return null;

            const entity = new this.model({ ...existing, ...data });
            const errors = entity.validate();
            if (errors.length > 0) {
                throw new ValidationError('Validation failed', errors);
            }
            data = entity.toDatabase();
        }

        const result = await this.repository.update(id, data);
        return this.model ? new this.model(result) : result;
    }

    async delete(id) {
        const result = await this.repository.delete(id);
        return this.model ? new this.model(result) : result;
    }

    async softDelete(id) {
        const result = await this.repository.softDelete(id);
        return this.model ? new this.model(result) : result;
    }
}