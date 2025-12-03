const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const path = require('path');

const app = express();

// --- 1. Configuración de Sesión ---
app.use(session({
    secret: 'un_secreto_seguro', // Cambia esto por algo más complejo en producción
    resave: false,
    saveUninitialized: true
}));

// --- 2. Inicializar Passport ---
app.use(passport.initialize());
app.use(passport.session());

// Serialización (Para guardar el usuario en la sesión)
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// --- 3. Estrategia de Steam ---
passport.use(new SteamStrategy({
    returnURL: 'http://localhost:3000/auth/steam/return',
    realm: 'http://localhost:3000/',
    apiKey: 'C661EA61498725A379CA1F8043804908' // ⚠️ RECUERDA: Protege esto con variables de entorno (.env)
  },
  (identifier, profile, done) => {
    // Aquí podrías guardar el usuario en tu base de datos si quisieras
    return done(null, profile);
  }
));

// --- 4. Archivos Estáticos ---
// Esto permite que el navegador encuentre tu index.html, css, js en la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));


// --- 5. RUTAS DE AUTENTICACIÓN ---

// Ruta para iniciar sesión (Redirige a Steam)
app.get('/auth/steam',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Ruta de retorno (A donde Steam devuelve al usuario)
app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    // Autenticación exitosa, redirigir al home
    res.redirect('/');
  }
);

// Ruta de Logout
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});


// --- 6. RUTA PRINCIPAL (La que fallaba) ---
// Al ser un HTML estático en 'public', usamos sendFile.
app.get('/', (req, res) => {
    // Si tienes el archivo en la carpeta 'public', express.static ya debería servirlo.
    // Pero forzamos la ruta aquí por seguridad:
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- 7. API EXTRA (Opcional) ---
// Como index.html es estático, no puede leer variables de servidor.
// Si necesitas mostrar el nombre del usuario en tu HTML, haz un fetch a esta ruta:
app.get('/api/user', (req, res) => {
    res.json(req.user || null);
});


// --- 8. Iniciar Servidor ---
app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});