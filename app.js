require('dotenv').config(); // Cargar variables de entorno al inicio
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

// IMPORTACIONES NUEVAS (Mercado Pago y RCON)
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { Rcon } = require('rcon-client');

const app = express();

// --- CONFIGURACIÓN MERCADO PAGO ---
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// --- CONFIGURACIÓN RCON (Minecraft / Ark) ---
const rconConfig = {
    host: process.env.RCON_HOST || '127.0.0.1',
    port: parseInt(process.env.RCON_PORT) || 25575,
    password: process.env.RCON_PASSWORD || 'tu_password'
};

// --- MIDDLEWARE ---
// IMPORTANTE: Necesario para leer el JSON que envía Mercado Pago y tu Frontend
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

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
    apiKey: process.env.STEAM_API_KEY
  },
  (identifier, profile, done) => {
    return done(null, profile);
  }
));

// --- 3b. Estrategia de Discord ---
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/discord/return',
    scope: ['identify', 'email']
  },
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }
));

// --- 4. Archivos Estáticos ---
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// NUEVAS RUTAS DE MERCADO PAGO Y RCON
// ==========================================

// RUTA A: CREAR LA PREFERENCIA DE PAGO
app.post('/crear-orden', async (req, res) => {
    try {
        // Obtenemos los datos desde el frontend
        const { title, price, quantity, userId, itemId } = req.body;

        // VALIDACIONES
        if (!title || !price || !quantity || !userId) {
            return res.status(400).json({ message: 'Faltan datos requeridos' });
        }

        if (price <= 0 || quantity <= 0) {
            return res.status(400).json({ message: 'Precio o cantidad inválida' });
        }

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [
                    {
                        title: title,
                        unit_price: Number(price),
                        quantity: Number(quantity),
                        currency_id: 'ARS',
                    }
                ],
                metadata: {
                    player_id: userId,
                    item_id: itemId
                },
                back_urls: {
                    success: "http://localhost:3000/exito.html",
                    failure: "http://localhost:3000/fallo.html",
                    pending: "http://localhost:3000/pendiente.html"
                },
                notification_url: "https://mealy-unimperious-antonio.ngrok-free.dev/webhook"            }
        });

        console.log('✅ Preferencia creada:', result.id);
        res.json({ id: result.id, init_point: result.init_point });

    } catch (error) {
        console.error("❌ Error al crear preferencia:", error);
        res.status(500).json({ message: error.message || "Error al crear la preferencia" });
    }
});

// RUTA B: WEBHOOK (Recepción del pago)
app.post('/webhook', async (req, res) => {
    const { query } = req;
    const topic = query.topic || query.type;

    if (topic === 'payment') {
        const paymentId = query.id || query['data.id'];
        
        try {
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: paymentId });
            
            if (paymentData.status === 'approved') {
                const player = paymentData.metadata.player_username;
                const item = paymentData.metadata.item_id; // Ej: 'diamond_sword' o Blueprint de Ark

                console.log(`✅ Pago aprobado de ${player}. Entregando ${item}...`);
                
                // Llamamos a la función RCON
                await entregarItemEnJuego(player, item);
            }
        } catch (error) {
            console.error("Error en Webhook:", error);
        }
    }
    
    res.sendStatus(200);
});

// FUNCIÓN AUXILIAR RCON
async function entregarItemEnJuego(player, item) {
    try {
        const rcon = await Rcon.connect(rconConfig);
        
        // COMANDO: Ajusta esto según sea Minecraft o Ark
        // Minecraft: /give Jugador item cantidad
        const command = `give ${player} ${item} 1`; 
        
        const response = await rcon.send(command);
        console.log("🎮 Respuesta del Servidor:", response);
        
        await rcon.end();
    } catch (error) {
        console.error("❌ Error conectando RCON:", error);
    }
}

// ==========================================
// FIN RUTAS NUEVAS
// ==========================================


// --- 5. RUTAS DE AUTENTICACIÓN (Tus rutas originales) ---

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

// Ruta Success Steam
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
            <body><p>Redirigiendo...</p></body>
            </html>
        `);
    } else {
        res.redirect('/');
    }
});

// Ruta Success Discord
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
            <body><p>Redirigiendo...</p></body>
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
        res.redirect('/');
    });
});

// --- 6. RUTA PRINCIPAL ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', 'index.html'));
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

// --- NUEVA RUTA: API PARA OBTENER CLAVE PÚBLICA DE MP ---
app.get('/api/mp-public-key', (req, res) => {
    res.json({ publicKey: process.env.MP_PUBLIC_KEY });
});

// --- 8. Iniciar Servidor ---
app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});