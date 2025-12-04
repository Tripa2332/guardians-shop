const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const path = require('path');

const app = express();

// --- 1. Configuración de Sesión ---
app.use(session({
    secret: 'un_secreto_seguro',
    resave: false,
    saveUninitialized: true
}));

// --- 2. Inicializar Passport ---
app.use(passport.initialize());
app.use(passport.session());

// Serialización
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
    apiKey: 'C661EA61498725A379CA1F8043804908'
  },
  (identifier, profile, done) => {
    return done(null, profile);
  }
));

// --- 4. Archivos Estáticos ---
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
    res.redirect('/auth/steam/success');
  }
);

// Nueva ruta para guardar datos en una página y redirigir
app.get('/auth/steam/success', (req, res) => {
    if (req.user) {
        // Renderizar una página que guarde los datos en localStorage
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Autenticación completada</title>
                <script>
                    const userData = {
                        name: '${req.user.displayName || 'Usuario'}',
                        avatar: '${req.user.photos && req.user.photos[0] ? req.user.photos[0].value : 'https://via.placeholder.com/40/FFD700/1C1C1C?text=U'}',
                        steamId: '${req.user.id}',
                        profileUrl: '${req.user.profileUrl}'
                    };
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    window.location.href = '/index.html';
                </script>
            </head>
            <body>
                <p>Redirigiendo...</p>
            </body>
            </html>
        `);
    } else {
        res.redirect('/');
    }
});

// Ruta de Logout
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cerrando sesión</title>
                <script>
                    localStorage.removeItem('currentUser');
                    window.location.href = '/index.html';
                </script>
            </head>
            <body>
                <p>Cerrando sesión...</p>
            </body>
            </html>
        `);
    });
});

// --- 6. RUTA PRINCIPAL ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 7. API PARA OBTENER USUARIO ---
app.get('/api/user', (req, res) => {
    if (req.user) {
        res.json({
            name: req.user.displayName,
            avatar: req.user.photos && req.user.photos[0] ? req.user.photos[0].value : null,
            steamId: req.user.id,
            profileUrl: req.user.profileUrl
        });
    } else {
        res.json(null);
    }
});

// --- 8. Iniciar Servidor ---
app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});