const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: 'credentials.conf' });

class DBConnection {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
        };
        this.schema = process.env.DB_SCHEMA;
        this.client = new Client(this.dbConfig);
    }

    async connect() {
        try {
            await this.client.connect();
            await this.client.query(`SET search_path TO ${this.schema}`);
            console.log('Connected to the database.');
        } catch (error) {
            console.error('Failed to connect to the database:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await this.client.end();
            console.log('Disconnected from the database.');
        } catch (error) {
            console.error('Failed to disconnect from the database:', error);
            throw error;
        }
    }

    async query(queryText, values) {
        try {
            const result = await this.client.query(queryText, values);
            return result;
        } catch (error) {
            console.error('Query execution failed:', error);
            throw error;
        }
    }
}

module.exports = DBConnection;
