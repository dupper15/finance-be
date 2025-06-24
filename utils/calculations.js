import { supabase } from '../config/database.js';

export const calculateAccountBalance = async (accountId, upToDate = null) => {
    let query = supabase
        .from('transactions')
        .select('amount, transaction_type, transfer_account_id')
        .eq('account_id', accountId);

    if (upToDate) {
        query = query.lte('transaction_date', upToDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    let balance = 0;

    data.forEach(transaction => {
        const amount = parseFloat(transaction.amount);

        if (transaction.transaction_type === 'income') {
            balance += amount;
        } else if (transaction.transaction_type === 'expense') {
            balance -= amount;
        } else if (transaction.transaction_type === 'transfer') {
            // For transfers, we need to check if this account is source or destination
            if (transaction.transfer_account_id) {
                balance -= amount; // This account is the source
            }
        }
    });

    // Also check for transfers where this account is the destination
    let transferQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('transfer_account_id', accountId)
        .eq('transaction_type', 'transfer');

    if (upToDate) {
        transferQuery = transferQuery.lte('transaction_date', upToDate);
    }

    const { data: transferData, error: transferError } = await transferQuery;

    if (transferError) throw transferError;

    transferData.forEach(transaction => {
        balance += parseFloat(transaction.amount);
    });

    return balance;
};

export const calculateCategoryTotal = async (categoryId, startDate, endDate, userId, includeSubcategories = false) => {
    let query = supabase
        .from('transactions')
        .select('amount, transaction_type')
        .eq('user_id', userId);

    if (includeSubcategories) {
        // Get all subcategories
        const { data: subcategories } = await supabase
            .from('categories')
            .select('category_id')
            .eq('parent_category_id', categoryId);

        const categoryIds = [categoryId, ...(subcategories || []).map(c => c.category_id)];
        query = query.in('category_id', categoryIds);
    } else {
        query = query.eq('category_id', categoryId);
    }

    if (startDate) query = query.gte('transaction_date', startDate);
    if (endDate) query = query.lte('transaction_date', endDate);

    const { data, error } = await query;

    if (error) throw error;

    return data.reduce((total, transaction) => {
        const amount = parseFloat(transaction.amount);
        return transaction.transaction_type === 'expense' ? total + amount : total;
    }, 0);
};