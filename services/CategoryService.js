import { BaseService } from '../core/BaseService.js';
import { Category } from '../models/Category.js';
import { NotFoundError } from '../core/NotFoundError.js';

export class CategoryService extends BaseService {
    constructor(categoryRepository) {
        super(categoryRepository, Category);
        this.categoryRepository = categoryRepository;
    }

    async getByUserId(userId, includeDefaults = true) {
        const categories = await this.categoryRepository.findByUserId(userId, includeDefaults);
        return categories.filter(cat => !cat.is_delete).map(category => new Category(category));
    }

    async getByUserAndId(userId, categoryId) {
        const category = await this.categoryRepository.findByUserAndId(userId, categoryId);
        if (!category || category.is_delete) {
            throw new NotFoundError('Category not found');
        }
        return new Category(category);
    }

    async create(userId, categoryData) {
        const data = {
            ...categoryData,
            user_id: userId,
            is_default: false,
            is_delete: false
        };
        return super.create(data);
    }

    async update(userId, categoryId, categoryData) {
        // Verify ownership (only user categories can be updated)
        const category = await this.getByUserAndId(userId, categoryId);
        if (category.is_default) {
            throw new Error('Cannot update default categories');
        }

        const updatedCategory = await this.categoryRepository.update(categoryId, categoryData);
        return new Category(updatedCategory);
    }

    async delete(userId, categoryId) {
        // Verify ownership (only user categories can be deleted)
        const category = await this.getByUserAndId(userId, categoryId);
        if (category.is_default) {
            throw new Error('Cannot delete default categories');
        }

        return await this.categoryRepository.delete(categoryId);
    }

    async softDelete(userId, categoryId) {
        // Verify ownership (only user categories can be deleted)
        const category = await this.getByUserAndId(userId, categoryId);
        if (category.is_default) {
            throw new Error('Cannot delete default categories');
        }

        const result = await this.categoryRepository.update(categoryId, {
            is_delete: true
        });
        return new Category(result);
    }

    async getCategoriesByType(userId, type) {
        const categories = await this.categoryRepository.findByType(userId, type);
        return categories.filter(cat => !cat.is_delete).map(category => new Category(category));
    }

    async getDefaultCategories() {
        const categories = await this.categoryRepository.findDefaultCategories();
        return categories.filter(cat => !cat.is_delete).map(category => new Category(category));
    }

    async getCategoryTotals(userId, startDate = null, endDate = null) {
        const categories = await this.getByUserId(userId);
        const categoryTotals = {};

        // This would require additional repository methods to calculate totals
        // Implementation would depend on specific requirements

        return categoryTotals;
    }

    async getCategoriesWithBudgets(userId, month, year) {
        const categories = await this.categoryRepository.findCategoriesWithBudgets(userId, month, year);
        return categories.filter(cat => !cat.is_delete).map(category => new Category(category));
    }
}