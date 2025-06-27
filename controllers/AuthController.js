export class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    async register(req, res, next) {
        try {
            const { email, password, name } = req.body;
            const result = await this.authService.register(email, password, name, req);
            
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await this.authService.login(email, password);
            
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            await this.authService.logout();
            
            res.json({ message: 'Logout successful' });
        } catch (error) {
            next(error);
        }
    }

    async confirmEmail(req, res, next) {
        try {
            const html = this.authService.getEmailConfirmationPage();
            res.send(html);
        } catch (error) {
            next(error);
        }
    }
}
