const express = require('express');
const passport = require('passport');
const router = express.Router();

// --- RUTAS STEAM ---
router.get('/steam', passport.authenticate('steam'));

// Retorno de Steam
router.get('/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    if (req.user) {
        const userData = {
            name: req.user.displayName || 'Usuario',
            avatar: req.user.photos && req.user.photos[0] ? req.user.photos[0].value : 'https://via.placeholder.com/40/FFD700/1C1C1C?text=U',
            steamId: req.user.id,
            profileUrl: req.user.profileUrl,
            provider: 'steam'
        };
        res.cookie('userData', JSON.stringify(userData), { httpOnly: false, maxAge: 86400000, path: '/' });
        res.redirect('/pages/index.html');
    }
  }
);

// --- RUTAS DISCORD ---
router.get('/discord', passport.authenticate('discord'));

// Retorno de Discord
router.get('/discord/return',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    if (req.user) {
        const avatarUrl = req.user.avatar 
            ? `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png`
            : 'https://via.placeholder.com/40/5865F2/FFFFFF?text=D';
        
        const userData = {
            name: req.user.username || 'Usuario',
            avatar: avatarUrl,
            discordId: req.user.id,
            email: req.user.email || '',
            provider: 'discord'
        };
        res.cookie('userData', JSON.stringify(userData), { httpOnly: false, maxAge: 86400000, path: '/' });
        res.redirect('/pages/index.html');
    }
  }
);

module.exports = router;