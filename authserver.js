const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const AuthService = require('./authservice');
const UserService = require('./userService');

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

const userService = new UserService({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'mojabaza',
}, schemaName);



authService.connect();
userService.connect();

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    const verification = authService.verifyToken(token);

    if (!verification.valid) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.user = verification.decoded;
    next();
}

app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  const registrationResponse = await authService.register(username, password, email);

  if (registrationResponse.success) {
    res.status(201).json({
      message: 'User registered successfully',
      user: registrationResponse.user
    });
  } else {
    res.status(400).json({ message: registrationResponse.message });
  }
});

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
  
    const isValid = await authService.verifyToken(token);
    
    if (isValid.valid) {
      res.json({ message: 'Token is valid.' });
    } else {
      res.status(401).json({ message: 'Token is invalid or expired.' });
    }
});

app.get('/users', authenticateToken, async (req, res) => {
    try {
        const users = await userService.getUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});
  

process.on('SIGINT', async () => {
  await authService.disconnect();
  process.exit();
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
