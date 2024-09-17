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

    async getCurrentUser(userId) {
        try {
            const query = `SELECT username, email FROM users WHERE id = $1`;
            const result = await this.dbConnection.query(query, [userId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error fetching current user:', error.message);
            throw new Error('Could not retrieve current user');
        }
    }
}

module.exports = UserService;
