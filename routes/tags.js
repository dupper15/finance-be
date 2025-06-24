import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import Joi from 'joi';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();
router.use(authenticateToken);

const tagSchema = Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).allow('', null),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null)
});

// Get all tags
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .eq('user_id', req.user.id)
            .order('name');

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create tag
router.post('/', validateRequest(tagSchema), async (req, res) => {
    try {
        const tagData = {
            ...req.body,
            user_id: req.user.id
        };

        const { data, error } = await supabase
            .from('tags')
            .insert([tagData])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update tag
router.put('/:id', validateRequest(tagSchema), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tags')
            .update(req.body)
            .eq('tag_id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete tag
router.delete('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tags')
            .delete()
            .eq('tag_id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        res.json({ message: 'Tag deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;