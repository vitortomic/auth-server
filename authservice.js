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

    async register(username, password, email) {
        try {
            const checkQuery = `
                SELECT id FROM "${this.schema}".users WHERE username = $1 OR email = $2
            `;
            const checkResult = await this.client.query(checkQuery, [username, email]);

            if (checkResult.rows.length > 0) {
                console.log('Username or email already exists.');
                return { success: false, message: 'Username or email already exists.' };
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const insertUserQuery = `
                INSERT INTO "${this.schema}".users (username, password, email)
                VALUES ($1, $2, $3)
                RETURNING id, username, email;
            `;
            const result = await this.client.query(insertUserQuery, [username, hashedPassword, email]);

            console.log('User registered:', result.rows[0]);
            return { success: true, user: result.rows[0] };
        } catch (error) {
            console.error('Error registering user:', error.message);
            return { success: false, message: 'Registration failed.' };
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

    verifyToken(token) {
      try {
          const [base64Header, base64Payload, signature] = token.split('.');

          const dataToSign = `${base64Header}.${base64Payload}`;
          const recalculatedSignature = crypto.createHmac('sha256', this.jwtSecret)
                    .update(dataToSign)
                    .digest('base64');
          

          if (signature !== recalculatedSignature) {
              console.log('Invalid token signature.');
              return { valid: false, message: 'Invalid token signature' };
          }

          const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));

          if (payload.exp < Math.floor(Date.now() / 1000)) {
              console.log('Token has expired.');
              return { valid: false, message: 'Token has expired' };
          }

          return { valid: true, decoded: payload };
      } catch (error) {
          console.error('Error validating token:', error.message);
          return { valid: false, message: 'Invalid token' };
      }
  }

}

module.exports = AuthService;
