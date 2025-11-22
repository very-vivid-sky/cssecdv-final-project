# Setup
1. Create a file called ".env", with the variables:
    * `MONGODB` — URI of the MongoDB deployment
    * `MONGODB_SECRET` — secret string for the MongoDB deployment to use when encrypting
2. Run the application without data to initialize empty collections
3. Manually register at least six users. Manual registration is required to ensure passwords remain compatible with your instance, as hashing may be different between devices.
4. Import the other files to MongoDB, and reconfigure the userAcc parameters of the other collections to match the user IDs of the newly created users 

# Running
1. "npm run dev start" on the terminal
2. **CTRL + c ** to end the the connection on the terminal 

# About the application:
