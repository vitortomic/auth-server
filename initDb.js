const readlineSync = require('readline-sync');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const host = readlineSync.question('Enter PostgreSQL host (default: localhost): ', { defaultInput: 'localhost' });
const port = readlineSync.question('Enter PostgreSQL port (default: 5432): ', { defaultInput: '5432' });
const user = readlineSync.question('Enter PostgreSQL username: ', { defaultInput: 'postgres' });
const password = readlineSync.question('Enter PostgreSQL password: ', { hideEchoBack: true }, { defaultInput: 'postgres' });
const database = readlineSync.question('Enter PostgreSQL database name: ', { defaultInput: 'mojabaza' });
const schemaName = readlineSync.question('Enter schema name: ', { defaultInput: 'mojasema' });

async function connectToPostgres() {
  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });
  await client.connect();
  return client;
}

async function connectToDatabase() {
  const client = new Client({
    host,
    port,
    user,
    password,
    database,
  });
  await client.connect();
  return client;
}

async function databaseExists(client, database) {
  const query = `SELECT 1 FROM pg_database WHERE datname = $1`;
  const res = await client.query(query, [database]);
  return res.rows.length > 0;
}

async function createDatabase(client, database) {
  const query = `CREATE DATABASE "${database}"`;
  await client.query(query);
  console.log(`Database "${database}" created.`);
}

async function schemaExists(client, schemaName) {
  const query = `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`;
  const res = await client.query(query, [schemaName]);
  return res.rows.length > 0;
}

async function createSchema(client, schemaName) {
  const query = `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`;
  await client.query(query);
  console.log(`Schema "${schemaName}" created or already exists.`);
}

async function executeDDL(client, schemaName) {
    try {
      await client.query(`SET search_path TO "${schemaName}"`);
  
      const ddl = `
        -- Create 'user' table
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE
        );
        
        -- Create 'token' table for JWT tokens
        CREATE TABLE IF NOT EXISTS tokens (
          id SERIAL PRIMARY KEY,
          token TEXT NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMP NOT NULL
        );
      `;
      
      await client.query(ddl);
      console.log('DDL executed successfully.');
  
    } catch (error) {
      console.error('Error executing DDL:', error.message);
    }
  }

async function main() {
  let client;
  try {
    client = await connectToPostgres();
    console.log('Connected to PostgreSQL server.');

    const dbExists = await databaseExists(client, database);

    if (!dbExists) {
      console.log(`Database "${database}" does not exist. Creating it...`);
      await createDatabase(client, database);
    } else {
      console.log(`Database "${database}" already exists.`);
    }

    await client.end();
    client = await connectToDatabase();
    console.log(`Connected to the database "${database}".`);

    const schemaExistsResult = await schemaExists(client, schemaName);

    if (!schemaExistsResult) {
      console.log(`Schema "${schemaName}" does not exist. Creating it...`);
      await createSchema(client, schemaName);
    } else {
      console.log(`Schema "${schemaName}" already exists.`);
    }

    await executeDDL(client, schemaName);

    await createUser(client, schemaName);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (client) await client.end();
    console.log('PostgreSQL connection closed.');
  }
}

async function createUser(client, schemaName) {
    try {
      const username = readlineSync.question('Enter username: ');
      const email = readlineSync.question('Enter email: ');
      const plainPassword = readlineSync.question('Enter password: ', { hideEchoBack: true });
  
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
      const insertUserQuery = `
        INSERT INTO "${schemaName}".users (username, password, email)
        VALUES ($1, $2, $3)
        RETURNING id, username, email;
      `;
      const res = await client.query(insertUserQuery, [username, hashedPassword, email]);
  
      console.log('User created:', res.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error.message);
    }
  }

main();
