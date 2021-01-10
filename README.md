# WijMakenDeWijkBackend
 
## Setup
1. Installing dependencies
    - Use `npm install`
2. Building the TypeScript code
    - Use `npm run-script build`
3. Adding environmental variables (local: create an `.env` file)
    - Insert a variable `MONGO_URL` with the URL to your MongoDB instance.
    - Insert a variable `SECRET_KEY` with a secret key for tokens.
4. Deployment (local: `node .` or `npm start`)

## Admin accounts
Since admin accounts currently can't be created by the API, take these steps to create one:
1. Create a regular account first
2. Set `role` to `admin` in the database. This can be done using MongoDB Compass.
