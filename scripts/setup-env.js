const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', 'backend', '.env')
const sampleEnvPath = path.join(__dirname, '..', 'backend', '.env.example')

if (!fs.existsSync(envPath)) {
    fs.copyFileSync(sampleEnvPath, envPath)
    console.log('.env file created from .env.example')
} else {
    console.log('.env file already exists')
}
