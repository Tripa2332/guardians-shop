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
const startOrderProcessing = require('./services/cronJobs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// ========================================
// IMPORTAR MODELOS Y RUTAS
// ========================================
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order'); // <--- 1. AGREGADO: Importante para que funcione el webhook
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
    secret: process.env.SESSION_SECRET || 'tu-secreto-super-seguro-2025',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        mongoUrl: mongoUri,
        touchAfter: 24 * 3600 // lazy session update
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
        sameSite: 'lax'
    },
    name: 'guardians-session' // Nombre único para la cookie
}));

app.use(passport.initialize());
app.use(passport.session());

// ========================================
// CONFIGURACIÓN DE PASSPORT
// ========================================

// Serializar usuario
passport.serializeUser((user, done) => {
    console.log('📌 Serializando usuario:', user._id);
    done(null, user._id);
});

// Deserializar usuario
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        console.log('📌 Deserializando usuario:', id, '- Encontrado:', !!user);
        done(null, user);
    } catch (err) {
        console.error('❌ Error deserializando:', err);
        done(err);
    }
});

// ⭐ ESTRATEGIA STEAM
passport.use(new SteamStrategy({
    returnURL: `${baseUrl}/auth/steam/return`,
    realm: baseUrl,
    apiKey: process.env.STEAM_API_KEY
}, async (identifier, profile, done) => {
    try {
        console.log('🔐 Steam profile recibido:', profile.steamID);
        console.log('🖼️ Avatar Steam:', profile.avatar);
        
        const steamName = profile.displayName || `Steam_${profile.steamID.slice(-8)}`;
        // Steam devuelve: profile.avatarmedium o profile.avatar
        const avatarUrl = profile.avatarmedium || profile.avatar || '/assets/img/default-avatar.png';
        
        let user = await User.findOne({ steamId: profile.steamID });

        if (user) {
            console.log('✅ Usuario Steam encontrado, actualizando...');
            user.name = steamName;
            user.avatar = avatarUrl;
            user.lastLogin = new Date();
            await user.save();
        } else {
            console.log('➕ Creando nuevo usuario Steam...');
            user = new User({
                steamId: profile.steamID,
                name: steamName,
                avatar: avatarUrl,
                authProvider: 'steam',
                lastLogin: new Date()
            });
            await user.save();
        }

        console.log('✅ Avatar guardado:', user.avatar);
        return done(null, user);
    } catch (err) {
        console.error('❌ Error en Steam strategy:', err);
        return done(err);
    }
}));

// ⭐ ESTRATEGIA DISCORD
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: `${baseUrl}auth/discord/return`,
    scope: ['identify', 'email', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('🔐 Discord profile recibido:', profile.id);
        console.log('🖼️ Avatar Discord hash:', profile.avatar);
        
        const discordName = profile.username || `Discord_${profile.id.slice(-8)}`;
        // Discord devuelve un hash, necesitamos construir la URL
        const avatarUrl = profile.avatar 
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`
            : '/assets/img/default-avatar.png';
        
        let user = await User.findOne({ discordId: profile.id });

        if (user) {
            console.log('✅ Usuario Discord encontrado, actualizando...');
            user.name = discordName;
            user.discordUsername = profile.username;
            user.avatar = avatarUrl;
            user.email = profile.email || user.email;
            user.lastLogin = new Date();
            await user.save();
        } else {
            console.log('➕ Creando nuevo usuario Discord...');
            user = new User({
                discordId: profile.id,
                discordUsername: profile.username,
                name: discordName,
                email: profile.email,
                avatar: avatarUrl,
                authProvider: 'discord',
                lastLogin: new Date()
            });
            await user.save();
        }

        console.log('✅ Avatar guardado:', user.avatar);
        return done(null, user);
    } catch (err) {
        console.error('❌ Error en Discord strategy:', err);
        return done(err);
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
// RUTA DE PERFIL
// ========================================

    const avatar = req.user.avatar || '/assets/img/default-avatar.png';
    const provider = req.user.authProvider || (req.user.steamId ? 'steam' : 'discord');

    res.json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email || '',
        avatar: avatar,
        provider: provider
    });
});

// ========================================
// LOGOUT
// ========================================
app.get('/logout', (req, res) => {
    console.log('🚪 Cerrando sesión del usuario:', req.user?._id);
    req.logout((err) => {
        if (err) {
            console.error('❌ Error en logout:', err);
            return res.status(500).json({ error: 'Error cerrando sesión' });
        }
        res.json({ success: true, message: 'Sesión cerrada' });
    });
});

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
        provider: req.user.provider || (req.user.steamId ? 'steam' : 'discord'),
        email: req.user.email
    });
});

// ========================================
// 2. AGREGADO: RUTA HISTORIAL DE COMPRAS
// ========================================
app.get('/api/my-orders', ensureAuthenticated, async (req, res) => {
    try {
        // Buscamos órdenes que pertenezcan a este usuario
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 }) // Ordenar por fecha: las más nuevas primero
            .limit(50); // Traer solo las últimas 50

        res.json(orders);
    } catch (error) {
        console.error("Error buscando órdenes:", error);
        res.status(500).json({ error: "Error interno al obtener el historial" });
    }
});
// ========================================
//  ZONA DE ADMINISTRACIÓN
// ========================================

// Middleware para proteger rutas de admin
const ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    // Si no es admin, redirigir al home o dar error 404 para ocultarlo
    res.status(404).sendFile(path.join(__dirname, 'public/pages', 'fallo.html')); 
    // O simplemente: res.redirect('/');
};
// --- RUTA BLINDADA DEL PANEL ---
app.get('/admin', ensureAdmin, (req, res) => {
    // __dirname apunta a la carpeta donde está app.js
    const rutaArchivo = path.resolve(__dirname, 'private', 'admin.html');
    console.log('Intentando servir archivo desde:', rutaArchivo); // Esto saldrá en la consola negra
    res.sendFile(rutaArchivo);
});
// // --- RUTA TEMPORAL: EJECUTAR UNA VEZ PARA HACERTE ADMIN ---
// // Visita: http://localhost:3000/setup-admin mientras estás logueado
// app.get('/setup-admin', ensureAuthenticated, async (req, res) => {
//     try {
//         req.user.role = 'admin';
//         await req.user.save();
//         res.send(`✅ ¡Hecho! El usuario <b>${req.user.displayName}</b> ahora es ADMINISTRADOR. <a href="/">Volver</a>`);
//     } catch (error) {
//         res.status(500).send('Error: ' + error.message);
//     }
// });

// 1. Crear Producto
app.post('/api/admin/products', ensureAdmin, async (req, res) => {
    try {
        const { sku, nombre, precio, descripcion, imagen, categoria, rconCommand, stock, emoji } = req.body;
        
        const existing = await Product.findOne({ sku });
        if (existing) return res.status(400).json({ success: false, message: 'El SKU ya existe' });

        const newProduct = await Product.create({
            sku, nombre, precio, descripcion, imagen, 
            category: categoria, 
            rconCommand, 
            stock: stock || -1,
            emoji: emoji || '📦'
        });

        res.json({ success: true, product: newProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Eliminar Producto
app.delete('/api/admin/products/:id', ensureAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Editar Producto (Básico: cambiar stock o precio)
app.put('/api/admin/products/:id', ensureAdmin, async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, product: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Ver Todas las Órdenes (Para el panel)
app.get('/api/admin/orders', ensureAdmin, async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'displayName email').sort({ createdAt: -1 }).limit(100);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========================================
// RUTAS DE MERCADO PAGO
// ========================================

// ✅ CREAR ORDEN (REQUIERE AUTENTICACIÓN)
app.post('/api/crear-orden', ensureAuthenticated, async (req, res) => {
    try {
        console.log('📨 Solicitud de orden recibida');
        console.log('Usuario autenticado:', req.user?.displayName || 'Desconocido');
        const { productSku, quantity } = req.body;

        // Validar entrada
        if (!productSku) {
            return res.status(400).json({ success: false, message: 'Falta el SKU del producto' });
        }

        // Buscar producto en BD
        const product = await Product.findOne({ sku: productSku });
        
        if (!product) {
            return res.status(404).json({ success: false, message: `Producto no encontrado: ${productSku}` });
        }

        if (!product.activo) {
            return res.status(400).json({ success: false, message: 'Producto no disponible' });
        }

        const quantityNum = Math.max(1, Number(quantity) || 1);
        const playerUsername = req.user.displayName || `Usuario_${req.user._id}`;

        // Crear preferencia en Mercado Pago
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

        const result = await preference.create({ body: orderData });

        console.log(`✅ Preferencia MP creada: ${result.id}`);
        res.json({ success: true, id: result.id, init_point: result.init_point });

    } catch (error) {
        console.error('❌ ERROR EN CHECKOUT:', error.message);
        res.status(500).json({ success: false, message: `Error al crear la orden: ${error.message}` });
    }
});

// ========================================
// WEBHOOK DE MERCADO PAGO MEJORADO
// ========================================
app.post('/webhook', async (req, res) => {
    try {
        const { query } = req;
        const topic = query.topic || query.type;

        if (topic === 'payment') {
            const paymentId = query.id || query['data.id'];
            
            if (!paymentId) return res.sendStatus(400);

            // 1. IDEMPOTENCIA
            const ordenExistente = await Order.findOne({ paymentId: String(paymentId) });
            if (ordenExistente && ordenExistente.status === 'approved') {
                console.log(`⚠️ Pago ${paymentId} ya fue procesado anteriormente.`);
                return res.sendStatus(200);
            }

            try {
                const payment = new Payment(mercadoPagoClient);
                const paymentData = await payment.get({ id: paymentId });
                
                if (paymentData.status === 'approved') {
                    const { player_username, product_sku, user_id } = paymentData.metadata;

                    if (!player_username || !product_sku || !user_id) {
                        console.error('❌ Metadata incompleta en pago aprobado');
                        return res.sendStatus(400);
                    }

                    const product = await Product.findOne({ sku: product_sku });
                    if (!product) {
                        console.error(`❌ Producto no encontrado: ${product_sku}`);
                        return res.sendStatus(400);
                    }

                    // Crear/Actualizar Orden
                    let orden = ordenExistente;
                    if (!orden) {
                        orden = await Order.create({
                            user: user_id,
                            paymentId: String(paymentId),
                            productSku: product.sku,
                            productName: product.nombre,
                            price: product.precio,
                            status: 'approved'
                        });
                    } else {
                        orden.status = 'approved';
                        await orden.save();
                    }

                    console.log(`✅ Pago ${paymentId} aprobado. Procesando entrega...`);

                    // Entregar Item
                    const entregado = await entregarItemEnJuego(player_username, product.rconCommand);

                    if (entregado) {
                        orden.deliveryStatus = 'delivered';
                        console.log(`🎁 Entrega exitosa a ${player_username}`);
                    } else {
                        orden.deliveryStatus = 'failed';
                        console.error(`⚠️ Falló la entrega RCON. Orden: ${orden._id}`);
                    }
                    
                 

                    await orden.save();
                }
            } catch (paymentError) {
                console.error('❌ Error procesando datos de pago:', paymentError);
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error crítico en webhook:', error);
        res.sendStatus(500);
    }
});

// ========================================
// FUNCIÓN RCON SEGURA
// ========================================
async function entregarItemEnJuego(player, rawCommand) {
    try {
        // SANITIZACIÓN
        const safePlayerName = player.replace(/[^a-zA-Z0-9_-]/g, "");

        if (safePlayerName !== player) {
            console.warn(`⚠️ Nombre sanitizado: "${player}" -> "${safePlayerName}"`);
        }

        const finalCommand = rawCommand.replace('{player}', safePlayerName);
        console.log(`🎮 RCON -> ${rconConfig.host}: ${finalCommand}`);
        
        const rcon = await Rcon.connect(rconConfig);
        const response = await rcon.send(finalCommand);
        await rcon.end();
        
        console.log(`✅ RCON Respuesta: ${response}`);
        return true;
    } catch (error) {
        console.error(`❌ Error RCON: ${error.message}`);
        return false;
    }
}

// ========================================
// RUTAS AUXILIARES
// ========================================
app.get('/api/mp-public-key', (req, res) => {
    res.json({ publicKey: process.env.MP_PUBLIC_KEY });
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
    res.status(404).json({ success: false, message: 'Ruta no encontrada', path: req.path });
});

// Iniciar el Cron Job
startOrderProcessing();

const port = process.env.PORT || 3000;

// ========================================
// INICIAR SERVIDOR
// ========================================
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════╗
    ║   🎮 Guardians Shop - Servidor    ║
    ║   Puerto: ${PORT}                    ║
    ║   Base URL: ${baseUrl}       ║
    ╚════════════════════════════════════╝
    `);
    
});
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 peticiones por IP
});
app.use('/api/', limiter);
module.exports = app;