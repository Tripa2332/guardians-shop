const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
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

// --- 3b. Estrategia de Discord ---
passport.use(new DiscordStrategy({
    clientID: '1445970263647850551',
    clientSecret: 'ufa0qW2nS5Bx7P9nW3NbEG-3y9IyLBPM',
    callbackURL: 'http://localhost:3000/auth/discord/return',
    scope: ['identify', 'email']
  },
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }
));

// --- 4. Archivos Estáticos ---
app.use(express.static(path.join(__dirname, 'public')));

// --- 5. RUTAS DE AUTENTICACIÓN ---

// Ruta para iniciar sesión con Steam
app.get('/auth/steam',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Ruta de retorno de Steam
app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/auth/steam/success');
  }
);

// Ruta para iniciar sesión con Discord
app.get('/auth/discord',
  passport.authenticate('discord')
);

// Ruta de retorno de Discord
app.get('/auth/discord/return',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/auth/discord/success');
  }
);

// Nueva ruta para guardar datos en una página y redirigir (Steam)
app.get('/auth/steam/success', (req, res) => {
    if (req.user) {
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
                        profileUrl: '${req.user.profileUrl}',
                        provider: 'steam'
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

// Nueva ruta para guardar datos en una página y redirigir (Discord)
app.get('/auth/discord/success', (req, res) => {
    if (req.user) {
        const avatarUrl = req.user.avatar 
            ? `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png`
            : 'https://via.placeholder.com/40/5865F2/FFFFFF?text=D';
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Autenticación completada</title>
                <script>
                    const userData = {
                        name: '${req.user.username || 'Usuario'}',
                        avatar: '${avatarUrl}',
                        discordId: '${req.user.id}',
                        email: '${req.user.email || ''}',
                        provider: 'discord'
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
            name: req.user.displayName || req.user.username,
            avatar: req.user.photos && req.user.photos[0] ? req.user.photos[0].value : null,
            id: req.user.id,
            provider: req.user.provider
        });
    } else {
        res.json(null);
    }
});

// --- 8. Iniciar Servidor ---
app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});