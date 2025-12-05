const express = require('express'); 
const router = express.Router();
const Order = require('../models/Order'); // <--- 1. IMPORTAR EL MODELO
// --- Obtener usuario actual ---
router.get('/user', (req, res) => {
    if (req.user) {
        res.json({
            name: req.user.displayName || req.user.username,
            avatar: req.user.avatar,
            id: req.user._id,
            balance: req.user.balance,
            provider: req.user.provider
        });
    } else {
        res.json(null);
    }
});

// --- Obtener clave pública de Mercado Pago ---
router.get('/mp-public-key', (req, res) => {
    res.json({ publicKey: process.env.MP_PUBLIC_KEY });
});

// --- 2. NUEVA RUTA: Obtener historial de compras ---
router.get('/my-orders', async (req, res) => {
    // Si no está logueado, devolvemos lista vacía
    if (!req.user) return res.json([]);

    try {
        // Buscamos órdenes que pertenezcan a este usuario (req.user._id)
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 }) // Ordenar por fecha: las más nuevas primero
            .limit(50); // Traer solo las últimas 50

        res.json(orders);
    } catch (error) {
        console.error("Error buscando órdenes:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

module.exports = router;