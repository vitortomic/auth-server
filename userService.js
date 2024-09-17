class UserService {
    constructor(dbConfig, schema) {
        this.dbConfig = dbConfig;
        this.schema = schema;
        this.client = new (require('pg').Client)(dbConfig);
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

    async getUsers() {
        try {
            const query = `SELECT username, email FROM "${this.schema}".users`;
            const result = await this.client.query(query);

            return result.rows;
        } catch (error) {
            console.error('Error fetching users:', error.message);
            throw new Error('Could not retrieve users');
        }
    }
}

module.exports = UserService;
