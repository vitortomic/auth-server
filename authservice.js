const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthService {
  constructor(dbConnection, jwtSecret) {
    this.dbConnection = dbConnection;
    this.jwtSecret = jwtSecret;
  }

  async register(username, password, email) {
    try {
      const checkQuery = `SELECT id FROM users WHERE username = $1 OR email = $2`;
      const checkResult = await this.dbConnection.query(checkQuery, [username, email]);

      if (checkResult.rows.length > 0) {
        console.log('Username or email already exists.');
        return { success: false, message: 'Username or email already exists.' };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const insertUserQuery = `INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email`;
      const result = await this.dbConnection.query(insertUserQuery, [username, hashedPassword, email]);

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
      const result = await this.dbConnection.query(query, [username]);

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
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
      };

      const base64Header = Buffer.from(JSON.stringify(header)).toString('base64');
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const dataToSign = `${base64Header}.${base64Payload}`;
      const signature = crypto.createHmac('sha256', this.jwtSecret)
                              .update(dataToSign)
                              .digest('base64');
      const token = `${base64Header}.${base64Payload}.${signature}`;

      const expirationDate = new Date(Date.now() + 60 * 60 * 1000);  // 1 hour expiration
      const insertTokenQuery = `INSERT INTO tokens (token, user_id, expires_at) VALUES ($1, $2, $3) RETURNING token`;
      const result = await this.dbConnection.query(insertTokenQuery, [token, userId, expirationDate]);

      console.log('Token created and stored in the database:', result.rows[0].token);
      return token;
    } catch (error) {
      console.error('Error creating and storing token:', error.message);
      throw new Error('Token generation failed');
    }
  }

  verifyToken(token) {
    try {
      const [base64Header, base64Payload, signature] = token.split('.');

      const dataToSign = `${base64Header}.${base64Payload}`;
      const recalculatedSignature = crypto.createHmac('sha256', this.jwtSecret).update(dataToSign).digest('base64');

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
