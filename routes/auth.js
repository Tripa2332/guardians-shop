const express = require('express');
const passport = require('passport');
const router = express.Router();

// ==============================
// RUTA STEAM
// ==============================
router.get('/steam', passport.authenticate('steam'));

router.get('/steam/return',
  passport.authenticate('steam', { failureRedirect: '/pages/login.html' }),
  (req, res) => {
    console.log('✅ Steam autenticado:', req.user._id);
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
router.get('/discord', passport.authenticate('discord'));

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