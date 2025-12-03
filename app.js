const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

const app = express();

// Configuración de sesión
app.use(session({
  secret: 'un_secreto_seguro',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Serialización
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Estrategia Steam
passport.use(new SteamStrategy({
    returnURL: 'http://localhost:3000/auth/steam/return',
    realm: 'http://localhost:3000/',
    apiKey: 'C661EA61498725A379CA1F8043804908'
  },
  (identifier, profile, done) => {
    return done(null, profile);
  }
));

// Importar rutas
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Ruta principal
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Bienvenido ${req.user.displayName} <br><img src="${req.user.photos[2].value}" />`);
  } else {
    res.send('<a href="/auth/steam">Login con Steam</a>');
  }
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));
