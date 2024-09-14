const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const AuthService = require('./authservice');

const app = express();
const port = 3000;

app.use(bodyParser.json());

const schemaName = 'mojasema'; 
const authService = new AuthService({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'mojabaza',
}, schemaName);

authService.connect();

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const isLoginSuccessful = await authService.login(username, password);

  if (isLoginSuccessful) {
    res.json({ message: 'Login successful' });
  } else {
    res.status(401).json({ message: 'Invalid username or password' });
  }
});

process.on('SIGINT', async () => {
  await authService.disconnect();
  process.exit();
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
