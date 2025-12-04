require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

// Integraciones
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { Rcon } = require('rcon-client');

// Importar las rutas de autenticación (NUEVO)
const authRoutes = require('./routes/auth');

const app = express();

// Configuración Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// Configuración RCON (Servidores de juego)
const rconConfig = {
    host: process.env.RCON_HOST || '127.0.0.1',
    port: parseInt(process.env.RCON_PORT) || 25575,
    password: process.env.RCON_PASSWORD
};

// Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesiones (Usando variable de entorno para el secreto)
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto_por_defecto_inseguro', 
    resave: false,
    saveUninitialized: true
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// --- ESTRATEGIAS PASSPORT (Actualizadas con BASE_URL) ---
// Usamos process.env.BASE_URL para no tener que cambiar el código al subir a producción

passport.use(new SteamStrategy({
    returnURL: `${process.env.BASE_URL}/auth/steam/return`,
    realm: `${process.env.BASE_URL}/`,
    apiKey: process.env.STEAM_API_KEY
  },
  (identifier, profile, done) => done(null, profile)
));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL}/auth/discord/return`,
    scope: ['identify', 'email']
  },
  (accessToken, refreshToken, profile, done) => done(null, profile)
));

// --- USAR RUTAS ---

// 1. Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// 2. Rutas de Autenticación (Conecta con routes/auth.js)
// Esto crea automáticamente rutas como /auth/steam, /auth/discord, etc.
app.use('/auth', authRoutes);

// 3. Rutas de Mercado Pago
app.post('/crear-orden', async (req, res) => {
    try {
        const { title, price, quantity, userId, itemId } = req.body;
        if (!title || !price || !quantity || !userId) return res.status(400).json({ message: 'Datos faltantes' });

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{ title, unit_price: Number(price), quantity: Number(quantity), currency_id: 'ARS' }],
                metadata: { player_id: userId, item_id: itemId },
                // URLs dinámicas
                back_urls: {
                    success: `${process.env.BASE_URL}./pages/exito.html`,
                    failure: `${process.env.BASE_URL}./pages/fallo.html`,
                    pending: `${process.env.BASE_URL}./pages/pendiente.html`
                },
                notification_url: `${process.env.WEBHOOK_URL}/webhook` // Usar variable distinta para webhook si usas ngrok
            }
        });
        res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
        console.error("Error MP:", error);
        res.status(500).json({ message: "Error al crear preferencia" });
    }
});

app.post('/webhook', async (req, res) => {
    const { query } = req;
    const topic = query.topic || query.type;

    if (topic === 'payment') {
        const paymentId = query.id || query['data.id'];
        try {
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: paymentId });
            
            if (paymentData.status === 'approved') {
                const { player_username, item_id } = paymentData.metadata;
                console.log(`✅ Pago aprobado: ${player_username} -> ${item_id}`);
                await entregarItemEnJuego(player_username, item_id);
            }
        } catch (error) {
            console.error("Error Webhook:", error);
        }
    }
    res.sendStatus(200);
});

// Función RCON mejorada con manejo de errores
async function entregarItemEnJuego(player, item) {
    try {
        const rcon = await Rcon.connect(rconConfig);
        const command = `give ${player} ${item} 1`; 
        const response = await rcon.send(command);
        console.log("🎮 RCON Res:", response);
        await rcon.end();
    } catch (error) {
        console.error("⚠️ Fallo RCON (El servidor puede estar offline):", error.message);
    }
}

// Rutas API y Logout
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

app.get('/api/user', (req, res) => {
    res.json(req.user ? {
        name: req.user.displayName || req.user.username,
        avatar: req.user.photos?.[0]?.value || null,
        id: req.user.id,
        provider: req.user.provider
    } : null);
});

app.get('/api/mp-public-key', (req, res) => res.json({ publicKey: process.env.MP_PUBLIC_KEY }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', 'index.html'));
});

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});