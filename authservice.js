const bcrypt = require('bcryptjs');
const { Client } = require('pg');

class AuthService {
    constructor(dbConfig, schema) {
        this.dbConfig = dbConfig;
        this.schema = schema;
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
      const query = 'SELECT username, password FROM users WHERE username = $1';
      const result = await this.client.query(query, [username]);
      console.log(result)

      if (result.rows.length === 0) {
        console.log('User not found.');
        return false;
      }

      const user = result.rows[0];

      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log(isPasswordValid)
      if (isPasswordValid) {
        console.log('Login successful.');
        return true;
      } else {
        console.log('Invalid password.');
        return false;
      }
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  }
}

module.exports = AuthService;
