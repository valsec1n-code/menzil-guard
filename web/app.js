const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

function createWebApp(discordClient) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('discordClient', discordClient);

  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'degistir-bu-cok-onemli',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 gün
  }));

  app.use(require('./routes/auth'));
  app.use(require('./routes/setup'));
  app.use(require('./routes/dashboard'));

  app.get('/', (req, res) => res.redirect('/dashboard'));

  return app;
}

module.exports = createWebApp;
