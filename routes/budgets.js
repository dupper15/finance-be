import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, budgetSchema } from '../middleware/validation.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { user_id, month, year } = req.query;


    if (!user_id || !month || !year) {
      return res.status(400).json({
        error: "Thiếu user_id, month hoặc year trong body",
      });
    }

    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const { data: budgets, error } = await supabase
      .from("budgets")
      .select(`
        budget_id,
        name,
        description,
        amount,
        duration,
        start_date,
        end_date,
        account_id,
        created_at,
        updated_at,
        user_id,
        is_delete,
        categories (
          category_id,
          name,
          type,
          created_at,
          user_id,
          is_delete
        )
      `)
      .eq("user_id", user_id)
      .gte("start_date", startDate.toISOString())
      .lt("start_date", endDate.toISOString())
      .eq("is_delete", false)
      .eq("categories.is_delete", false)
      .order("created_at", { ascending: false });
        console.log('budgets', budgets);
    if (error) throw error;

    const grouped = {};

    for (const budget of budgets) {
      const cat = budget.categories;

      if (!cat) continue;

      if (!grouped[cat.category_id]) {
        grouped[cat.category_id] = {
          category_id: cat.category_id,
          name: cat.name,
          type: cat.type,
          created_at: cat.created_at,
          user_id: cat.user_id,
          budgets: [],
        };
      }

      grouped[cat.category_id].budgets.push({
        budget_id: budget.budget_id,
        name: budget.name,
        description: budget.description,
        amount: budget.amount,
        duration: budget.duration,
        start_date: budget.start_date,
        end_date: budget.end_date,
        account_id: budget.account_id,
        created_at: budget.created_at,
        updated_at: budget.updated_at,
        user_id: budget.user_id,
      });
    }
    const result = Object.values(grouped);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi truy vấn ngân sách:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      amount,
      duration,
      start_date,
      end_date,
      account_id,
      category_id,
      user_id
    } = req.body;

    if (
      !name ||
      !amount ||
      !duration ||
      !start_date ||
      !end_date ||
      !account_id ||
      !category_id ||
      !user_id
    ) {
      return res.status(400).json({
        error: 'Thiếu một hoặc nhiều trường bắt buộc trong body',
      });
    }

    const { data, error } = await supabase
      .from('budgets')
      .insert([
        {
          name,
          description,
          amount,
          duration,
          start_date,
          end_date,
          account_id,
          category_id,
          user_id,
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Lỗi khi tạo ngân sách:', error.message);
    res.status(500).json({ error: error.message });
  }
});
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      amount,
      duration,
      start_date,
      end_date,
      account_id,
      category_id
    } = req.body;
    console.log('data', req.body);
    if (
      !name || !amount || !duration ||
      !start_date || !end_date || !account_id || !category_id
    ) {
      console.log('Missing required fields');
      return res.status(400).json({
        error: "Thiếu một hoặc nhiều trường bắt buộc trong body",
      });
    }

    const { data, error } = await supabase
      .from('budgets')
      .update({
        name,
        description,
        amount,
        duration,
        start_date,
        end_date,
        account_id,
        category_id,
        updated_at: new Date().toISOString()
      })
      .eq('budget_id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Không tìm thấy ngân sách để cập nhật' });
    }

    res.json(data);
  } catch (error) {
    console.error('Lỗi khi cập nhật ngân sách:', error.message);
    res.status(500).json({ error: error.message });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('budgets')
      .update({ is_delete: true })
      .eq('budget_id', id)
      .eq('is_delete', false) 
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: 'Ngân sách không tồn tại hoặc đã bị xoá',
      });
    }

    res.json({
      message: 'Đã xoá mềm ngân sách thành công',
      budget: data[0]
    });
  } catch (error) {
    console.error('Lỗi khi xoá ngân sách:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/progress', async (req, res) => {
    try {
        // Get budget details
        const { data: budget, error: budgetError } = await supabase
            .from('budgets')
            .select('*')
            .eq('budget_id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (budgetError) throw budgetError;

        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        // Calculate spent amount based on budget criteria
        let query = supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', req.user.id)
            .gte('transaction_date', budget.start_date)
            .lte('transaction_date', budget.end_date);

        if (budget.account_id) {
            query = query.eq('account_id', budget.account_id);
        }

        if (budget.category_id) {
            query = query.eq('category_id', budget.category_id);
        }

        if (!budget.include_income) {
            query = query.neq('transaction_type', 'income');
        }

        if (!budget.include_transfers) {
            query = query.neq('transaction_type', 'transfer');
        }

        const { data: transactions, error: transactionError } = await query;

        if (transactionError) throw transactionError;

        const spent = transactions.reduce((total, transaction) => {
            return total + parseFloat(transaction.amount);
        }, 0);

        const remaining = parseFloat(budget.amount) - spent;
        const percentage = (spent / parseFloat(budget.amount)) * 100;

        res.json({
            budget,
            spent,
            remaining,
            percentage: Math.min(percentage, 100),
            isOverBudget: spent > parseFloat(budget.amount)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;