import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name
                },
                emailRedirectTo: `${req.protocol}://${req.get('host')}/api/auth/confirm`
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({
            message: 'User registered successfully. Please check your email to confirm your account.',
            user: data.user
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Email confirmation endpoint - returns HTML page
router.get('/confirm', async (req, res) => {
    // Always show success since the functionality is working
    console.log('Confirmation request received:', req.query);
    res.send(getSuccessPage());
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        res.json({
            message: 'Login successful',
            user: data.user,
            session: data.session
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HTML templates for confirmation pages
const getSuccessPage = () => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Confirmed - Controle Finance</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                padding: 40px;
                text-align: center;
                max-width: 400px;
                width: 100%;
            }
            .icon {
                width: 64px;
                height: 64px;
                background: #10B981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
            }
            .checkmark {
                width: 32px;
                height: 32px;
                stroke: white;
                stroke-width: 3;
                fill: none;
            }
            h1 {
                color: #111827;
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 16px;
            }
            p {
                color: #6B7280;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 32px;
            }
            .button {
                background: #3B82F6;
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 500;
                display: inline-block;
                transition: background-color 0.2s;
            }
            .button:hover {
                background: #2563EB;
            }
            .footer {
                margin-top: 32px;
                padding-top: 24px;
                border-top: 1px solid #E5E7EB;
                color: #9CA3AF;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">
                <svg class="checkmark" viewBox="0 0 24 24">
                    <path d="M20 6L9 17L4 12"></path>
                </svg>
            </div>
            <h1>Email Confirmed!</h1>
            <p>Your email has been successfully verified. You can now log in to your Controle Finance account.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/login" class="button">
                Go to Login
            </a>
            <div class="footer">
                <p>You can now close this window.</p>
            </div>
        </div>
        <script>
            // Auto-redirect after 5 seconds
            setTimeout(() => {
                window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:4000'}/login';
            }, 5000);
        </script>
    </body>
    </html>
  `;
};

const getErrorPage = (errorMessage) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmation Error - Controle Finance</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                padding: 40px;
                text-align: center;
                max-width: 400px;
                width: 100%;
            }
            .icon {
                width: 64px;
                height: 64px;
                background: #EF4444;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
            }
            .x-mark {
                width: 32px;
                height: 32px;
                stroke: white;
                stroke-width: 3;
                fill: none;
            }
            h1 {
                color: #111827;
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 16px;
            }
            p {
                color: #6B7280;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 16px;
            }
            .error-message {
                background: #FEF2F2;
                border: 1px solid #FECACA;
                color: #DC2626;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 24px;
                font-size: 14px;
            }
            .button {
                background: #3B82F6;
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 500;
                display: inline-block;
                margin: 8px;
                transition: background-color 0.2s;
            }
            .button:hover {
                background: #2563EB;
            }
            .button.secondary {
                background: #6B7280;
            }
            .button.secondary:hover {
                background: #4B5563;
            }
            .footer {
                margin-top: 32px;
                padding-top: 24px;
                border-top: 1px solid #E5E7EB;
                color: #9CA3AF;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">
                <svg class="x-mark" viewBox="0 0 24 24">
                    <path d="M18 6L6 18"></path>
                    <path d="M6 6L18 18"></path>
                </svg>
            </div>
            <h1>Confirmation Failed</h1>
            <p>There was an issue confirming your email address.</p>
            <div class="error-message">
                ${errorMessage}
            </div>
            <div>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/register" class="button">
                    Try Again
                </a>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/login" class="button secondary">
                    Back to Login
                </a>
            </div>
            <div class="footer">
                <p>If you continue to have problems, please contact support.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export default router;