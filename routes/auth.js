const express = require('express');
const passport = require('passport');
const router = express.Router();

// ==============================
// RUTA STEAM
// ==============================
router.get('/steam', passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
    // Passport redirige automáticamente a Steam
});

router.get('/steam/return', passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
    console.log('✅ Autenticación Steam exitosa');
     if (req.user) {
        // Guardar sesión y redirigir
        res.redirect('/pages/index.html');
    } else {
        res.redirect('/pages/login.html');
    }
  }
);

// ==============================
// RUTA DISCORD
// ==============================
router.get('/discord', passport.authenticate('discord'), (req, res) => {
    // Passport redirige automáticamente a Discord
});

router.get('/discord/return',
  passport.authenticate('discord', { failureRedirect: '/pages/login.html' }),
  (req, res) => {
    console.log('✅ Discord autenticado:', req.user._id);
    if (req.user) {
        res.redirect('/pages/index.html');
    } else {
        res.redirect('/pages/login.html');
    }
  }
);

module.exports = router;