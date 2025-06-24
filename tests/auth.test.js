import request from 'supertest';
import app from '../server.js';

describe('Auth Endpoints', () => {
    describe('POST /api/auth/register', () => {
        test('should register a new user', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('User registered successfully');
        });

        test('should not register user with invalid email', async () => {
            const userData = {
                email: 'invalid-email',
                password: 'password123',
                name: 'Test User'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(response.status).toBe(400);
        });
    });
});