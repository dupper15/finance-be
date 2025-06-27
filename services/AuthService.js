export class AuthService {
    constructor(database) {
        this.db = database.getClient();
    }

    async register(email, password, name, req) {
        const { data, error } = await this.db.auth.signUp({
            email,
            password,
            options: {
                data: { name },
                emailRedirectTo: `${req.protocol}://${req.get('host')}/api/auth/confirm`
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        return {
            message: 'User registered successfully. Please check your email to confirm your account.',
            user: data.user
        };
    }

    async login(email, password) {
        const { data, error } = await this.db.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw new Error(error.message);
        }

        return {
            message: 'Login successful',
            user: data.user,
            session: data.session
        };
    }

    async logout() {
        const { error } = await this.db.auth.signOut();

        if (error) {
            throw new Error(error.message);
        }

        return { message: 'Logout successful' };
    }

    getEmailConfirmationPage() {
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
                setTimeout(() => {
                    window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:4000'}/login';
                }, 5000);
            </script>
        </body>
        </html>
        `;
    }
}
