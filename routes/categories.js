import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all categories (user's + defaults)
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .or(`user_id.eq.${req.user.id},is_default.eq.true`)
            .order('name');

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create category
router.post('/', async (req, res) => {
    try {
        const categoryData = {
            ...req.body,
            user_id: req.user.id,
            is_default: false
        };

        const { data, error } = await supabase
            .from('categories')
            .insert([categoryData])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;