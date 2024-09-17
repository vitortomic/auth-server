class UserService {
    constructor(dbConnection) {
        this.dbConnection = dbConnection;
    }

    async getUsers() {
        try {
            const query = `SELECT username, email FROM users`;
            const result = await this.dbConnection.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error fetching users:', error.message);
            throw new Error('Could not retrieve users');
        }
    }
}

module.exports = UserService;
