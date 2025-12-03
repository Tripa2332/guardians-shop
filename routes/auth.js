const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/steam',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

router.get('/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

module.exports = router;
