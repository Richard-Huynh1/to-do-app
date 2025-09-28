# To Do
An app to keep track of your things to do.
## How to Set up the Database
Open pgAdmin 4 and create a database called "to-dos". Then run the following query commands:
```
DROP TABLE IF EXISTS tasks, users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users (id),
  timeframe TEXT
);
```
## Create an Environmental Variables File
You will have to create a .env file with the following variables:
```
SESSION_SECRET="your session secret here"
PG_USER="your user here"
PG_HOST="your host here"
PG_DATABASE="to_dos"
PG_PASSWORD="your password here"
PG_PORT="your port here"
GOOGLE_CLIENT_ID="your Google client id here"
GOOGLE_CLIENT_SECRET="your Google client secret here"
```
## How to Run the Server
```
npm i
node index.js
```