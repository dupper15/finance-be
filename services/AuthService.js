export class AuthService {
    constructor(database, twoFactorAuthRepository = null) {
        this.db = database.getClient();
        this.twoFactorAuthRepository = twoFactorAuthRepository;
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

        if (this.twoFactorAuthRepository) {
            const twoFactorAuth = await this.twoFactorAuthRepository.findByUserId(data.user.id);

            if (twoFactorAuth && twoFactorAuth.is_enabled) {
                return {
                    message: 'Two-factor authentication required',
                    user: data.user,
                    session: data.session,
                    requiresTwoFactor: true
                };
            }
        }

        return {
            message: 'Login successful',
            user: data.user,
            session: data.session
        };
    }

    async completeTwoFactorLogin(userId) {
        const { data, error } = await this.db.auth.getUser();

        if (error || !data.user || data.user.id !== userId) {
            throw new Error('Invalid session for two-factor completion');
        }

        const { data: session, error: sessionError } = await this.db.auth.getSession();

        if (sessionError || !session.session) {
            throw new Error('Failed to retrieve session');
        }

        return {
            message: 'Two-factor authentication completed',
            user: data.user,
            session: session.session
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
                    color: #333;
                }
                .container {
                    background: white;
                    padding: 3rem;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                }
                .success-icon {
                    width: 80px;
                    height: 80px;
                    background: #10b981;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 2rem;
                    color: white;
                    font-size: 2rem;
                }
                h1 {
                    color: #1f2937;
                    margin-bottom: 1rem;
                    font-size: 2rem;
                }
                p {
                    color: #6b7280;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                }
                .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 1rem 2rem;
                    border-radius: 50px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: transform 0.2s;
                    border: none;
                    cursor: pointer;
                }
                .button:hover {
                    transform: translateY(-2px);
                }
                .footer {
                    margin-top: 2rem;
                    color: #9ca3af;
                    font-size: 0.9rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✓</div>
                <h1>Email Confirmed!</h1>
                <p>Your email has been successfully verified.
                You can now log in to your Controle Finance account.</p>
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