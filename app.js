const mongoose = require('mongoose');
const helper = require('./controllers/controllerHelper.js');
const express = require('express');
const session = require('express-session');
const handlebars = require('express-handlebars');
const bodyParser = require('body-parser')
const mongoStore = require('connect-mongodb-session')(session);
require("dotenv").config();

const { auditContextMiddleware } = require('./middleware/auditLogger.js');

const mongoURI = process.env.MONGODB;
const mongoSecret = process.env.MONGODB_SECRET;

mongoose
    .connect(mongoURI)
    .then(() => {
        console.log('App connected to Staples Database');
        const PORT = 3000;
        //only listen to a port if the mongoose connection is a success    
        app.listen(PORT, () => {
            console.log(`Listening to port ${PORT}`);
        })
    })
    .catch((error) => {
        console.log(error)
    });

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'hbs');
app.engine(
  "hbs",
  handlebars.engine({
    extname: "hbs",
    defaultLayout: false,
    layoutsDir: "views/layouts/",
    helpers: {
      renderStars: (rating) => helper.generateStarHTML(rating),

      eq: (a, b) => a === b,

      formatDate: (date) => {
        if (!date) return "—";
        return new Date(date).toLocaleString();
      },

      stringify: (obj) => {
        try {
          return JSON.stringify(obj, null, 2); // optional pretty format
        } catch (e) {
          return "";
        }
      }
    }
  })
);

const routes = require('./routes/routes.js');
const noCacheMiddleware = require('./middleware/noCacheMiddleware.js');

app.use(auditContextMiddleware);
app.use((req, res, next) => {
    console.log('[AUDIT CONTEXT]', {
        ipAddress: req.auditContext?.ipAddress,
        userAgent: req.auditContext?.userAgent
    });
    next();
});

app.use(express.static('public'));
app.use(session({
    secret: mongoSecret,
    saveUninitialized: true, 
    resave: false,
    store: new mongoStore({ 
      uri: mongoURI,
      collection: 'mySession',
      expires: 1000*60*60 // 1 hour
    }),
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true, // Prevents client-side JS from accessing the session cookie
        sameSite: 'lax' // CSRF protection
    }
}));

// Apply no-cache headers to prevent back-button access after logout
app.use(noCacheMiddleware);

module.exports = app;

function finalClose() {
    console.log('Close connection at the end!');
    mongoose.connection.close();
    process.exit();
}

app.use(`/`, routes);

// Generic error handler (catches multer file filter errors and others)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err && err.message ? err.message : err);
    if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('jpeg')) {
        return res.status(400).send({ message: 'Only JPEG and PNG files are allowed.' });
    }
    if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('png')) {
        return res.status(400).send({ message: 'Only JPEG and PNG files are allowed.' });
    }
    // fallback
    return res.status(500).send({ message: 'Internal Server Error' });
});

process.on('SIGTERM', finalClose); //general termination signal
process.on('SIGINT', finalClose);  //catches when ctrl + c is used
process.on('SIGQUIT', finalClose); //catches other termination commands
