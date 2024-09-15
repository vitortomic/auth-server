const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const AuthService = require('./authservice');

const app = express();
const port = 3001;
const jwtSecret = crypto.randomBytes(32).toString('base64');

app.use(bodyParser.json());

const schemaName = 'mojasema'; 
const authService = new AuthService({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'mojabaza',
}, 
schemaName,
jwtSecret);

authService.connect();

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    const loginResponse = await authService.login(username, password);
  
    if (loginResponse.success) {
      res.json({ message: 'Login successful', token: loginResponse.token });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
});

app.post('/validate-token', async (req, res) => {
    const { token } = req.body;
  
    const isValid = await authService.isTokenValid(token);
  
    if (isValid) {
      res.json({ message: 'Token is valid.' });
    } else {
      res.status(401).json({ message: 'Token is invalid or expired.' });
    }
});
  

process.on('SIGINT', async () => {
  await authService.disconnect();
  process.exit();
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
