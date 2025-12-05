const express = require('express');
const passport = require('passport');
const router = express.Router();
const { check, validationResult } = require('express-validator');
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
// 2. Modificar la ruta de registro
router.post('/register', [
    // Validaciones (Middlewares)
    check('username', 'El usuario es obligatorio').not().isEmpty().trim().escape(),
    check('email', 'Agrega un email válido').isEmail().normalizeEmail(),
    check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
    check('steamId', 'El SteamID es obligatorio').not().isEmpty().trim().escape()
], async (req, res) => {

    // 3. Revisar si hubo errores
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Si hay errores, retornamos 400 y la lista de errores
        // O renderizamos la vista 'register' mostrando los errores
        return res.render('register', { errors: errors.array() }); 
    }

    // Si pasa la validación, continúa tu lógica normal de registro...
    const { username, email, password, steamId } = req.body;
    
    try {
        // Tu lógica existente de crear usuario...
        // ...
    } catch (error) {
        console.error(error);
        res.render('register', { error: 'Error al registrar usuario' });
    }
});
module.exports = router;