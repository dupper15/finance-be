import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.post('/', async (req, res) => {
  try {
    const { name, type, user_id } = req.body;

    if (!name || !type || !user_id) {
      return res.status(400).json({
        error: "Thiếu name, type hoặc user_id trong body",
      });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          name,
          type,
          user_id,
          is_default: false,
          is_delete: false,
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("Lỗi khi tạo category:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name ) {
      return res.status(400).json({
        error: "Thiếu name trong body",
      });
    }
    console.log('Updating category with ID:', id);
    const { data, error } = await supabase
      .from('categories')
      .update({
        name,
      })
      .eq('category_id', id)
      .eq('is_delete', false) 
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Category không tồn tại hoặc đã bị xoá' });
    }

    res.json(data);
  } catch (error) {
    console.error('Lỗi khi cập nhật category:', error.message);
    res.status(500).json({ error: error.message });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('categories')
      .update({ is_delete: true })
      .eq('category_id', id)
      .eq('is_delete', false) 
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: 'Không tìm thấy category hoặc category đã bị xoá trước đó',
      });
    }

    res.json({
      message: 'Xoá mềm category thành công',
      category: data[0],
    });
  } catch (error) {
    console.error('Lỗi khi xoá category:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;