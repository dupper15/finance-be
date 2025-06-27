import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export class Database {
    constructor() {
        this.client = null;
        this.init();
    }

    init() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase configuration');
        }

        this.client = createClient(supabaseUrl, supabaseServiceKey);
    }

    getClient() {
        return this.client;
    }
}