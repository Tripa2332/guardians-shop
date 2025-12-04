const express = require('express');
const { Rcon } = require('rcon-client');
const router = express.Router();

// --- Obtener usuario actual ---
router.get('/user', (req, res) => {
    if (req.user) {
        res.json({
            name: req.user.displayName || req.user.username,
            avatar: req.user.photos?.[0]?.value || null,
            id: req.user.id,
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

// --- NUEVA RUTA: Obtener jugadores online ---
router.get('/players-online', async (req, res) => {
    try {
        const rcon = new Rcon({
            host: process.env.RCON_HOST || '127.0.0.1',
            port: parseInt(process.env.RCON_PORT) || 25575,
            password: process.env.RCON_PASSWORD
        });

        await rcon.connect();
        
        // Comando para obtener jugadores
        let response;
        let online = 0;
        
        try {
            // Intenta con comando Minecraft
            response = await rcon.send('list');
            const match = response.match(/(\d+)/);
            online = match ? parseInt(match[1]) : 0;
        } catch (e) {
            // Si falla, intenta con Ark
            try {
                response = await rcon.send('listplayers');
                const lines = response.split('\n').length - 2; // Restar cabecera
                online = lines > 0 ? lines : 0;
            } catch (e2) {
                console.warn('⚠️ No se pudo obtener lista de jugadores');
                online = 0;
            }
        }
        
        await rcon.end();

        console.log(`✅ Jugadores online: ${online}`);
        
        res.json({ 
            online: online,
            max: 200,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('❌ Error RCON:', error);
        res.status(500).json({ 
            online: 0, 
            max: 200,
            error: error.message 
        });
    }
});

module.exports = router;