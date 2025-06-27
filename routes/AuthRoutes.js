import express from 'express';

export class AuthRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('authController');
        this.setupRoutes();
    }

    setupRoutes() {
        this.router.post('/register', this.controller.register.bind(this.controller));
        this.router.post('/login', this.controller.login.bind(this.controller));
        this.router.post('/logout', this.controller.logout.bind(this.controller));
        this.router.get('/confirm', this.controller.confirmEmail.bind(this.controller));
    }

    getRouter() {
        return this.router;
    }
}
