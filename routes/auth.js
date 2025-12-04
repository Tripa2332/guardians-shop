const express = require('express');
const passport = require('passport');
const router = express.Router();

// --- RUTAS STEAM ---
// Iniciar sesión
router.get('/steam',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Retorno de Steam
router.get('/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    // Redirige a la ruta de éxito definida en app.js o maneja el éxito aquí
    res.redirect('/auth/steam/success'); 
  }
);

// Ruta de éxito para Steam (Manejada aquí para mantener orden)
router.get('/steam/success', (req, res) => {
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
            <body><p>Redirigiendo...</p></body>
            </html>
        `);
    } else {
        res.redirect('/');
    }
});

// --- RUTAS DISCORD ---
router.get('/discord', passport.authenticate('discord'));

router.get('/discord/return',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/auth/discord/success');
  }
);

router.get('/discord/success', (req, res) => {
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
            <body><p>Redirigiendo...</p></body>
            </html>
        `);
    } else {
        res.redirect('/');
    }
});

module.exports = router;