const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const crypto = require('crypto');

class AuthService {
    constructor(dbConfig, schema, jwtSecret) {
        this.dbConfig = dbConfig;
        this.schema = schema;
        this.jwtSecret = jwtSecret;
        this.client = new Client(dbConfig);
    }

    async connect() {
        try {
            await this.client.connect();
            await this.client.query(`SET search_path TO ${this.schema}`);
            console.log('Connected to the database.');
        } catch (error) {
            console.error('Failed to connect to the database:', error);
        }
    }

    async disconnect() {
        try {
            await this.client.end();
            console.log('Disconnected from the database.');
        } catch (error) {
            console.error('Failed to disconnect from the database:', error);
        }
    }

    async login(username, password) {
        try {
            const query = 'SELECT id, username, password FROM users WHERE username = $1';
            const result = await this.client.query(query, [username]);

            if (result.rows.length === 0) {
                console.log('User not found.');
                return false;
            }

            const user = result.rows[0];
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (isPasswordValid) {
                console.log('Login successful.');
                const token = await this.createToken(user.id);
                return { success: true, token };
            } else {
                console.log('Invalid password.');
                return { success: false };
            }
        } catch (error) {
            console.error('Error during login:', error);
            return { success: false };
        }
    }

    async createToken(userId) {
        try {
            const header = {
                alg: 'HS256',
                typ: 'JWT'
            };

            const payload = {
                userId,
                exp: Math.floor(Date.now() / 1000) + (60 * 60) // Expiration time: 1 hour from now
            };

            const base64Header = Buffer.from(JSON.stringify(header)).toString('base64');
            const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

            const dataToSign = `${base64Header}.${base64Payload}`;
            const signature = crypto
                .createHmac('sha256', this.jwtSecret)
                .update(dataToSign)
                .digest('base64');

            const token = `${base64Header}.${base64Payload}.${signature}`;

            const expirationDate = new Date(Date.now() + 60 * 60 * 1000);  // 1 hour expiration
            const insertTokenQuery = `
                INSERT INTO "${this.schema}".tokens (token, user_id, expires_at)
                VALUES ($1, $2, $3)
                RETURNING token;
            `;
            const result = await this.client.query(insertTokenQuery, [token, userId, expirationDate]);

            console.log('Token created and stored in the database:', result.rows[0].token);

            return token;
        } catch (error) {
            console.error('Error creating and storing token:', error.message);
            throw new Error('Token generation failed');
        }
    }

    async deleteTokenByUserId(userId) {
        try {
            const deleteQuery = `DELETE FROM "${this.schema}".tokens WHERE user_id = $1`;
            const result = await this.client.query(deleteQuery, [userId]);
            console.log(`Deleted ${result.rowCount} token(s) for userId: ${userId}`);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error deleting token:', error.message);
            return false;
        }
    }

    async isTokenValid(token) {
        try {
            const [base64Header, base64Payload, signature] = token.split('.');

            const dataToSign = `${base64Header}.${base64Payload}`;
            const recalculatedSignature = crypto
                .createHmac('sha256', this.jwtSecret)
                .update(dataToSign)
                .digest('base64');

            if (signature !== recalculatedSignature) {
                console.log('Invalid token signature.');
                return false;
            }

            const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));

            if (payload.exp < Math.floor(Date.now() / 1000)) {
                console.log('Token has expired.');
                return false;
            }

            console.log('Token is valid.');
            return true;
        } catch (error) {
            console.error('Error validating token:', error.message);
            return false;
        }
    }
}

module.exports = AuthService;
