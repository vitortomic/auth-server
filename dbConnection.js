const { Client } = require('pg');

class DBConnection {
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
