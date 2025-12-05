require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { Rcon } = require('rcon-client');

// ========================================
// IMPORTAR MODELOS Y RUTAS
// ========================================
const User = require('./models/User');
const Product = require('./models/Product');
const authRoutes = require('./routes/auth');

const app = express();

// ========================================
// CONFIGURACIÓN BASE
// ========================================
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/guardians-shop';
const PORT = process.env.PORT || 3000;

console.log(`🌍 Base URL: ${baseUrl}`);
console.log(`📊 MongoDB: ${mongoUri}`);

// ========================================
// CONEXIÓN A BASE DE DATOS
// ========================================
mongoose.connect(mongoUri)
    .then(() => console.log('✅ Base de datos MongoDB conectada'))
    .catch(err => console.error('❌ Error conectando a BD:', err.message));

// ========================================
// CONFIGURACIÓN DE INTEGRACIONES
// ========================================
const mercadoPagoClient = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

const rconConfig = {
    host: process.env.RCON_HOST || '127.0.0.1',
    port: parseInt(process.env.RCON_PORT) || 25575,
    password: process.env.RCON_PASSWORD
};

// ========================================
// MIDDLEWARE GLOBAL
// ========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ========================================
// CONFIGURACIÓN DE SESIONES
// ========================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto_temporal',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUri }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 semana
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// ========================================
// CONFIGURACIÓN DE PASSPORT
// ========================================
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
                avatar: profile.photos[2]?.value || profile.photos[0]?.value
            });
            console.log("✅ Usuario Steam nuevo creado:", user.displayName);
        } else {
            user.displayName = profile.displayName;
            user.avatar = profile.photos[2]?.value || profile.photos[0]?.value;
            await user.save();
        }
        return done(null, user);
    } catch (error) {
        console.error('❌ Error en estrategia Steam:', error);
        return done(error, null);
    }
}));

// --- ESTRATEGIA DISCORD ---
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: `${baseUrl}/auth/discord/return`,
    scope: ['identify', 'email']
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const avatarUrl = profile.avatar 
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` 
            : null;

        let user = await User.findOne({ discordId: profile.id });
        
        if (!user) {
            user = await User.create({
                discordId: profile.id,
                displayName: profile.username || profile.global_name,
                email: profile.email,
                avatar: avatarUrl,
                provider: 'discord'
            });
            console.log("✅ Usuario Discord nuevo creado:", user.displayName);
        } else {
            user.displayName = profile.username || profile.global_name;
            if(avatarUrl) user.avatar = avatarUrl;
            await user.save();
        }
        return done(null, user);
    } catch (err) {
        console.error('❌ Error en estrategia Discord:', err);
        return done(err, null);
    }
}));

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ 
        success: false,
        message: 'Debes iniciar sesión para realizar esta acción' 
    });
};

// ========================================
// RUTAS DE AUTENTICACIÓN
// ========================================
app.use('/auth', authRoutes);

// ========================================
// RUTAS DE API - PRODUCTOS (PÚBLICO)
// ========================================
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({ activo: true });
        
        const grouped = {
            vips: products.filter(p => p.category === 'vips'),
            kits: products.filter(p => p.category === 'kits'),
            dinos: products.filter(p => p.category === 'dinos'),
            blueprints: products.filter(p => p.category === 'blueprints'),
            tribelog: products.filter(p => p.category === 'tribelog')
        };
        
        console.log(`📦 Productos enviados: ${products.length}`);
        res.json(grouped);
    } catch (error) {
        console.error('❌ Error en /api/products:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// RUTAS DE API - USUARIO ACTUAL
// ========================================
app.get('/api/user', (req, res) => {
    if (!req.user) {
        return res.json(null);
    }
    
    res.json({
        id: req.user._id,
        name: req.user.displayName,
        avatar: req.user.avatar,
        balance: req.user.balance || 0,
        provider: req.user.provider || (req.user.steamId ? 'steam' : 'discord'),
        email: req.user.email
    });
});

// ========================================
// RUTAS DE MERCADO PAGO
// ========================================

// ✅ CREAR ORDEN (REQUIERE AUTENTICACIÓN)
app.post('/api/crear-orden', ensureAuthenticated, async (req, res) => {
    try {
        console.log('📨 Solicitud de orden recibida');
        console.log('Usuario autenticado:', req.user?.displayName || 'Desconocido');
        console.log('Body:', req.body);

        const { productSku, quantity } = req.body;

        // Validar entrada
        if (!productSku) {
            console.warn('❌ Falta productSku');
            return res.status(400).json({ 
                success: false,
                message: 'Falta el SKU del producto' 
            });
        }

        // 1️⃣ Buscar producto en BD
        console.log(`🔍 Buscando producto con SKU: ${productSku}`);
        const product = await Product.findOne({ sku: productSku });
        
        console.log('Producto encontrado:', product);

        if (!product) {
            console.warn(`❌ Producto no encontrado: ${productSku}`);
            return res.status(404).json({ 
                success: false,
                message: `Producto no encontrado: ${productSku}` 
            });
        }

        // 2️⃣ Validar que el producto está activo
        if (!product.activo) {
            console.warn('❌ Producto no activo');
            return res.status(400).json({ 
                success: false,
                message: 'Producto no disponible' 
            });
        }

        // 3️⃣ Calcular cantidad
        const quantityNum = Math.max(1, Number(quantity) || 1);

        // 4️⃣ Obtener datos del usuario de la sesión
        const playerUsername = req.user.displayName || `Usuario_${req.user._id}`;

        console.log(`✅ Validación exitosa. Preparando orden:`);
        console.log(`   - Producto: ${product.nombre}`);
        console.log(`   - Precio: $${product.precio}`);
        console.log(`   - Cantidad: ${quantityNum}`);
        console.log(`   - Jugador: ${playerUsername}`);

        // 5️⃣ Crear preferencia en Mercado Pago
        const preference = new Preference(mercadoPagoClient);
        
        const orderData = {
            items: [{
                id: product.sku,
                title: product.nombre,
                unit_price: Number(product.precio),
                quantity: quantityNum,
                currency_id: 'ARS'
            }],
            metadata: { 
                player_username: playerUsername,
                product_sku: product.sku,
                user_id: req.user._id.toString()
            },
            back_urls: {
                success: `${baseUrl}/pages/exito.html`,
                failure: `${baseUrl}/pages/fallo.html`,
                pending: `${baseUrl}/pages/pendiente.html`
            },
            notification_url: `${process.env.WEBHOOK_URL}/webhook`
        };

        console.log('📤 Enviando a Mercado Pago:', JSON.stringify(orderData, null, 2));

        const result = await preference.create({ body: orderData });

        console.log(`✅ Preferencia creada en Mercado Pago:`);
        console.log(`   - ID: ${result.id}`);
        console.log(`   - URL: ${result.init_point}`);

        res.json({ 
            success: true,
            id: result.id, 
            init_point: result.init_point 
        });

    } catch (error) {
        console.error('❌ ERROR EN CHECKOUT:');
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
        console.error('   Response:', error.response?.data || 'Sin datos de respuesta');

        res.status(500).json({ 
            success: false,
            message: `Error al crear la orden: ${error.message}`,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ========================================
// WEBHOOK DE MERCADO PAGO
// ========================================
app.post('/webhook', async (req, res) => {
    try {
        const { query } = req;
        const topic = query.topic || query.type;

        console.log(`📬 Webhook recibido - Tipo: ${topic}`);

        if (topic === 'payment') {
            const paymentId = query.id || query['data.id'];
            
            if (!paymentId) {
                console.warn('⚠️ No se recibió ID de pago');
                return res.sendStatus(400);
            }

            try {
                const payment = new Payment(mercadoPagoClient);
                const paymentData = await payment.get({ id: paymentId });
                
                console.log(`💳 Estado de pago: ${paymentData.status}`);

                if (paymentData.status === 'approved') {
                    // Extraer metadata segura
                    const { player_username, product_sku, user_id } = paymentData.metadata;
                    
                    if (!player_username || !product_sku) {
                        console.error('❌ Metadata incompleta en pago aprobado');
                        return res.sendStatus(400);
                    }

                    // Buscar producto en BD
                    const product = await Product.findOne({ sku: product_sku });
                    
                    if (product) {
                        console.log(`✅ Pago aprobado. Entregando ${product.name} a ${player_username}`);
                        
                        // Entregar item en juego
                        await entregarItemEnJuego(player_username, product.rconCommand);
                        
                        // Actualizar balance del usuario si es necesario
                        if (user_id) {
                            await User.findByIdAndUpdate(user_id, {
                                $inc: { balance: product.precio || 0 }
                            });
                        }
                    } else {
                        console.error(`❌ Producto no encontrado para entrega: ${product_sku}`);
                    }
                } else if (paymentData.status === 'rejected') {
                    console.warn('❌ Pago rechazado');
                } else if (paymentData.status === 'pending') {
                    console.log('⏳ Pago pendiente');
                }
            } catch (paymentError) {
                console.error('❌ Error consultando pago:', paymentError);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error en webhook:', error);
        res.sendStatus(500);
    }
});

// ========================================
// FUNCIÓN RCON (ENTREGAR ITEMS)
// ========================================
async function entregarItemEnJuego(player, rawCommand) {
    try {
        console.log(`🎮 Intentando conectar RCON a ${rconConfig.host}:${rconConfig.port}`);
        
        const rcon = await Rcon.connect(rconConfig);
        
        // Reemplazar placeholder {player} con nombre real
        const finalCommand = rawCommand.replace('{player}', player);
        
        console.log(`📤 Enviando comando: ${finalCommand}`);
        const response = await rcon.send(finalCommand);
        
        console.log(`✅ Respuesta RCON: ${response}`);
        await rcon.end();
        
        return true;
    } catch (error) {
        console.error(`⚠️ Error RCON: ${error.message}`);
        return false;
    }
}

// ========================================
// RUTAS AUXILIARES
// ========================================

app.get('/api/mp-public-key', (req, res) => {
    res.json({ 
        publicKey: process.env.MP_PUBLIC_KEY 
    });
});

app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

// ========================================
// RUTAS ESTÁTICAS
// ========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', 'index.html'));
});

// ========================================
// MANEJO DE ERRORES 404
// ========================================

app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'Ruta no encontrada',
        path: req.path 
    });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════╗
    ║   🎮 Guardians Shop - Servidor    ║
    ║   Puerto: ${PORT}                     ║
    ║   Base URL: ${baseUrl}       ║
    ╚════════════════════════════════════╝
    `);
});

module.exports = app;