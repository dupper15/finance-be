export class BaseController {
    constructor(service) {
        this.service = service;
    }

    async getAll(req, res, next) {
        try {
            const filters = this.buildFilters(req);
            const options = this.buildOptions(req);

            const result = await this.service.getAll(filters, options);

            res.json({
                success: true,
                data: result.data,
                ...(options.limit && {
                    pagination: {
                        page: Math.floor((options.offset || 0) / options.limit) + 1,
                        limit: options.limit,
                        total: result.count
                    }
                })
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const result = await this.service.getById(req.params.id);

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'
                });
            }

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const result = await this.service.create(req.body);

            res.status(201).json({
                success: true,
                data: result,
                message: 'Resource created successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const result = await this.service.update(req.params.id, req.body);

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'
                });
            }

            res.json({
                success: true,
                data: result,
                message: 'Resource updated successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await this.service.delete(req.params.id);

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'
                });
            }

            res.json({
                success: true,
                message: 'Resource deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    buildFilters(req) {
        const filters = {};

        // Add user_id filter for authenticated routes
        if (req.user?.id) {
            filters.user_id = req.user.id;
        }

        return filters;
    }

    buildOptions(req) {
        const options = {};

        // Pagination
        if (req.query.page && req.query.limit) {
            options.limit = parseInt(req.query.limit);
            options.offset = (parseInt(req.query.page) - 1) * options.limit;
        }

        // Ordering
        if (req.query.order_by) {
            options.orderBy = {
                field: req.query.order_by,
                ascending: req.query.order_direction !== 'desc'
            };
        }

        return options;
    }
}