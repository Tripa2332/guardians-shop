const express = require('express');
const passport = require('passport');
const router = express.Router();

// ---------------------------------------
// RUTA STEAM
// ---------------------------------------
router.get('/steam', passport.authenticate('steam'));

router.get('/steam/return',
  passport.authenticate('steam', { failureRedirect: '/pages/login.html' }),
  (req, res) => {
    if (req.user) {
        // Adaptado para usar los datos de MongoDB directamente
        const userData = {
            id: req.user._id,      // ID único de la Base de Datos
            steamId: req.user.steamId,
            name: req.user.displayName || 'Superviviente',
            avatar: req.user.avatar, // Ya guardamos la URL limpia en app.js
            balance: req.user.balance || 0, // ¡Ahora puedes mostrar su saldo!
            provider: 'steam'
        };
        
        // Guardamos la cookie igual que antes
        res.cookie('userData', JSON.stringify(userData), { 
            httpOnly: false, 
            maxAge: 86400000, // 24 horas
            path: '/' 
        });
        
        res.redirect('/pages/index.html');
    } else {
        res.redirect('/pages/login.html');
    }
  }
);

// ---------------------------------------
// RUTA DISCORD
// ---------------------------------------
router.get('/discord', passport.authenticate('discord'));

router.get('/discord/return',
  passport.authenticate('discord', { failureRedirect: '/pages/login.html' }),
  (req, res) => {
    if (req.user) {
        const userData = {
            id: req.user._id,
            discordId: req.user.discordId,
            name: req.user.displayName || 'Usuario Discord',
            avatar: req.user.avatar, // URL limpia desde BD
            balance: req.user.balance || 0,
            provider: 'discord'
        };
        
        res.cookie('userData', JSON.stringify(userData), { 
            httpOnly: false, 
            maxAge: 86400000,
            path: '/' 
        });
        
        res.redirect('/pages/index.html');
    } else {
        res.redirect('/pages/login.html');
    }
  }
);

module.exports = router;