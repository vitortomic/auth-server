const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');

const AuthService = require('./authservice');
const UserService = require('./userService');
const DBConnection = require('./dbConnection');

const app = express();
const port = 3001;
const jwtSecret = crypto.randomBytes(32).toString('base64');

app.use(bodyParser.json());

const dbConnection = new DBConnection();

const authService = new AuthService(dbConnection, jwtSecret);
const userService = new UserService(dbConnection);

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


dbConnection.connect();

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
  const isValid = authService.verifyToken(token);

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

app.get('/current-user', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId;
      const currentUser = await userService.getCurrentUser(userId);
  
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.json(currentUser);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching current user' });
    }
  });

process.on('SIGINT', async () => {
  await dbConnection.disconnect();
  process.exit();
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
