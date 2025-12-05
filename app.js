require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const mongoose = require('mongoose');
// Corrección para importar MongoStore en diferentes versiones
const MongoStore = require('connect-mongo').default || require('connect-mongo');

// Modelos
const User = require('./models/User');

// Integraciones externas
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { Rcon } = require('rcon-client');
const authRoutes = require('./routes/auth');

const app = express();

// --- CONFIGURACIÓN DE URL BASE ---
// Si no hay BASE_URL en el .env, usa localhost por defecto
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
console.log(`🌍 Base URL configurada en: ${baseUrl}`);

// --- CONEXIÓN BASE DE DATOS ---
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/guardians-shop';

mongoose.connect(mongoUri)
    .then(() => console.log('✅ Base de datos MongoDB conectada'))
    .catch(err => {
        console.error('❌ Error conectando a BD:', err.message);
    });

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

// Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto_temporal',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUri }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 semana
    }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// --- ESTRATEGIA STEAM ---
passport.use(new SteamStrategy({
    returnURL: `${baseUrl}/auth/steam/return`,
    realm: `${baseUrl}/`,
    apiKey: process.env.STEAM_API_KEY
  },
  async (identifier, profile, done) => {
    try {
        let user = await User.findOne({ steamId: profile.id });
        if (!user) {
            user = await User.create({
                steamId: profile.id,
                displayName: profile.displayName,
                avatar: profile.photos[2].value
            });
            console.log("¡Usuario Steam nuevo creado!");
        } else {
            user.displayName = profile.displayName;
            user.avatar = profile.photos[2].value;
            await user.save();
        }
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
  }
));

// --- ESTRATEGIA DISCORD ---
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: `${baseUrl}/auth/discord/return`, 
    scope: ['identify', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ discordId: profile.id });
        const avatarUrl = profile.avatar 
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` 
            : null;

        if (!user) {
            console.log("Creando nuevo usuario de Discord...");
            user = await User.create({
                discordId: profile.id,
                displayName: profile.username || profile.global_name,
                email: profile.email,
                avatar: avatarUrl,
                provider: 'discord'
            });
        } else {
            user.displayName = profile.username || profile.global_name;
            if(avatarUrl) user.avatar = avatarUrl;
            await user.save();
        }
        return done(null, user);
    } catch (err) {
        console.error("Error en estrategia Discord:", err);
        return done(err, null);
    }
  }
));

// --- RUTAS ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/auth', authRoutes);

// Mercado Pago
app.post('/crear-orden', async (req, res) => {
    try {
        const { title, price, quantity, userId, itemId } = req.body;
        if (!title || !price || !quantity || !userId) return res.status(400).json({ message: 'Datos faltantes' });

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{ title, unit_price: Number(price), quantity: Number(quantity), currency_id: 'ARS' }],
                metadata: { player_id: userId, item_id: itemId },
                back_urls: {
                    success: `${baseUrl}/pages/exito.html`,
                    failure: `${baseUrl}/pages/fallo.html`,
                    pending: `${baseUrl}/pages/pendiente.html`
                },
                notification_url: `${process.env.WEBHOOK_URL}/webhook`
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

// Función RCON
async function entregarItemEnJuego(player, item) {
    try {
        const rcon = await Rcon.connect(rconConfig);
        const command = `give ${player} ${item} 1`; 
        const response = await rcon.send(command);
        console.log("🎮 RCON Res:", response);
        await rcon.end();
    } catch (error) {
        console.error("⚠️ Fallo RCON:", error.message);
    }
}

// Rutas auxiliares
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

app.get('/api/user', (req, res) => {
    res.json(req.user ? {
        name: req.user.displayName || req.user.username,
        avatar: req.user.avatar || req.user.photos?.[0]?.value,
        id: req.user.id,
        provider: req.user.provider
    } : null);
});

app.get('/api/mp-public-key', (req, res) => res.json({ publicKey: process.env.MP_PUBLIC_KEY }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', 'index.html'));
});

// Iniciar servidor
app.listen(3000, () => {
    console.log(`Servidor corriendo en ${baseUrl}`);
});