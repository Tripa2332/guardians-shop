require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/guardians-shop';

const productos = [
  // ========================================
  // VIPS
  // ========================================
  {
    sku: 'vip_primitive',
    nombre: 'VIP Primitive',
    descripcion: 'Acceso básico con beneficios de inicio',
    precio: 5.99,
    emoji: '🛡️',
    category: 'vips',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Consumables/PrimalItemConsumable_VIPToken_Primitive.PrimalItemConsumable_VIPToken_Primitive\'" 1 1 false'
  },
  {
    sku: 'vip_tambaleante',
    nombre: 'VIP Tambaleante',
    descripcion: 'Paquete intermedio con ventajas PvP',
    precio: 12.99,
    emoji: '⚔️',
    category: 'vips',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Consumables/PrimalItemConsumable_VIPToken_Wobbling.PrimalItemConsumable_VIPToken_Wobbling\'" 1 1 false'
  },
  {
    sku: 'vip_aprendiz',
    nombre: 'VIP Aprendiz',
    descripcion: 'Ideal para jugadores que suben de nivel',
    precio: 19.99,
    emoji: '📚',
    category: 'vips',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Consumables/PrimalItemConsumable_VIPToken_Apprentice.PrimalItemConsumable_VIPToken_Apprentice\'" 1 1 false'
  },
  {
    sku: 'vip_oficial',
    nombre: 'VIP Oficial',
    descripcion: 'Rango oficial con perks permanentes',
    precio: 29.99,
    emoji: '👑',
    category: 'vips',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Consumables/PrimalItemConsumable_VIPToken_Official.PrimalItemConsumable_VIPToken_Official\'" 1 1 false'
  },
  {
    sku: 'vip_mastercraft',
    nombre: 'VIP Mastercraft',
    descripcion: 'Artículos Tek y materiales de construcción',
    precio: 44.99,
    emoji: '🔧',
    category: 'vips',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Consumables/PrimalItemConsumable_VIPToken_Mastercraft.PrimalItemConsumable_VIPToken_Mastercraft\'" 1 1 false'
  },
  {
    sku: 'vip_ascendente',
    nombre: 'VIP Ascendente',
    descripcion: 'Máximo poder: dinos ascendentes y perks únicos',
    precio: 59.99,
    emoji: '✨',
    category: 'vips',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Consumables/PrimalItemConsumable_VIPToken_Ascendant.PrimalItemConsumable_VIPToken_Ascendant\'" 1 1 false'
  },

  // ========================================
  // KITS
  // ========================================
  {
    sku: 'kit_starter',
    nombre: 'Kit Starter',
    descripcion: 'Recursos básicos para comenzar tu aventura',
    precio: 3.99,
    emoji: '📦',
    category: 'kits',
    rconCommand: 'giveitemnum {player} 1 100 1 0'
  },
  {
    sku: 'kit_herramientas',
    nombre: 'Kit Herramientas Pro',
    descripcion: 'Herramientas de calidad para trabajar más rápido',
    precio: 7.99,
    emoji: '🔨',
    category: 'kits',
    rconCommand: 'giveitemnum {player} 19 1 1 0'
  },
  {
    sku: 'kit_construccion',
    nombre: 'Kit Construcción',
    descripcion: 'Materiales para construir estructuras avanzadas',
    precio: 15.99,
    emoji: '🏗️',
    category: 'kits',
    rconCommand: 'giveitemnum {player} 335 500 1 0'
  },
  {
    sku: 'kit_combate',
    nombre: 'Kit Combate Elite',
    descripcion: 'Armas y armaduras de combate supremo',
    precio: 24.99,
    emoji: '⚡',
    category: 'kits',
    rconCommand: 'giveitemnum {player} 314 1 1 0'
  },
  {
    sku: 'kit_sobrevivencia',
    nombre: 'Kit Sobrevivencia',
    descripcion: 'Todo lo necesario para sobrevivir en el árido',
    precio: 9.99,
    emoji: '🌵',
    category: 'kits',
    rconCommand: 'giveitemnum {player} 266 300 1 0'
  },
  {
    sku: 'kit_completo',
    nombre: 'Kit Completo Premium',
    descripcion: 'Todos los kits en uno. ¡La mejor opción!',
    precio: 49.99,
    emoji: '💎',
    category: 'kits',
    rconCommand: 'giveitemnum {player} 1 200 1 0'
  },

  // ========================================
  // DINOSAURIOS
  // ========================================
  {
    sku: 'dino_raptor',
    nombre: 'Raptor Rápido',
    descripcion: 'Dinosaurio rápido para exploración',
    precio: 12.99,
    emoji: '🦖',
    category: 'dinos',
    rconCommand: 'summon Raptor_Character_BP_C'
  },
  {
    sku: 'dino_rex',
    nombre: 'T-Rex Dominante',
    descripcion: 'El rey de los dinosaurios en combate',
    precio: 39.99,
    emoji: '👹',
    category: 'dinos',
    rconCommand: 'summon Rex_Character_BP_C'
  },
  {
    sku: 'dino_triceratops',
    nombre: 'Triceratops Tanque',
    descripcion: 'Defensor perfecto para la tribu',
    precio: 34.99,
    emoji: '🦏',
    category: 'dinos',
    rconCommand: 'summon Trike_Character_BP_C'
  },
  {
    sku: 'dino_pteranodon',
    nombre: 'Pteranodon Volador',
    descripcion: 'Viaja por los cielos sin límites',
    precio: 19.99,
    emoji: '🦅',
    category: 'dinos',
    rconCommand: 'summon Ptero_Character_BP_C'
  },
  {
    sku: 'dino_griffin',
    nombre: 'Griffin Mítico',
    descripcion: 'Montura legendaria y poderosa',
    precio: 59.99,
    emoji: '🐉',
    category: 'dinos',
    rconCommand: 'summon Griffin_Character_BP_C'
  },
  {
    sku: 'dino_phoenix',
    nombre: 'Phoenix Ascendente',
    descripcion: 'El dinosaurio más raro y poderoso',
    precio: 99.99,
    emoji: '🔥',
    category: 'dinos',
    rconCommand: 'summon Phoenix_Character_BP_C'
  },

  // ========================================
  // BLUEPRINTS
  // ========================================
  {
    sku: 'bp_casa_basica',
    nombre: 'BP Casa Básica',
    descripcion: 'Plano para construir una casa resistente',
    precio: 4.99,
    emoji: '🏠',
    category: 'blueprints',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Structures/BuildingBPs/PrimalItemStructure_StoneHouse.PrimalItemStructure_StoneHouse\'" 1 1 false'
  },
  {
    sku: 'bp_fortaleza',
    nombre: 'BP Fortaleza Medieval',
    descripcion: 'Diseño épico para una fortaleza defensiva',
    precio: 12.99,
    emoji: '🏰',
    category: 'blueprints',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Structures/BuildingBPs/PrimalItemStructure_IronHouse.PrimalItemStructure_IronHouse\'" 1 1 false'
  },
  {
    sku: 'bp_granja',
    nombre: 'BP Granja de Cultivos',
    descripcion: 'Estructura para agricultura eficiente',
    precio: 6.99,
    emoji: '🌾',
    category: 'blueprints',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Structures/Misc/PrimalItemStructure_CropPlot_Large.PrimalItemStructure_CropPlot_Large\'" 1 1 false'
  },
  {
    sku: 'bp_laboratorio_tek',
    nombre: 'BP Laboratorio Tek',
    descripcion: 'Tecnología avanzada Tek en construcción',
    precio: 24.99,
    emoji: '🔬',
    category: 'blueprints',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Structures/TekStructures/PrimalItemStructure_TekLab.PrimalItemStructure_TekLab\'" 1 1 false'
  },
  {
    sku: 'bp_arena_pvp',
    nombre: 'BP Arena PvP',
    descripcion: 'Construcción perfecta para combates',
    precio: 14.99,
    emoji: '⚔️',
    category: 'blueprints',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Structures/Misc/PrimalItemStructure_WallLarge.PrimalItemStructure_WallLarge\'" 5 1 false'
  },
  {
    sku: 'bp_castillo_tek',
    nombre: 'BP Castillo Tek Supremo',
    descripcion: 'La estructura más avanzada y hermosa',
    precio: 39.99,
    emoji: '👑',
    category: 'blueprints',
    rconCommand: 'giveitems {player} "Blueprint\'/Game/PrimalItem/Structures/TekStructures/PrimalItemStructure_TekWall.PrimalItemStructure_TekWall\'" 10 1 false'
  },

  // ========================================
  // TRIBE LOG
  // ========================================
  {
    sku: 'log_semanal',
    nombre: 'Reporte Semanal de Tribu',
    descripcion: 'Análisis completo de actividad de 7 días',
    precio: 2.99,
    emoji: '📊',
    category: 'tribelog',
    rconCommand: 'admin'
  },
  {
    sku: 'log_mensual',
    nombre: 'Reporte Mensual Premium',
    descripcion: 'Estadísticas avanzadas del mes completo',
    precio: 7.99,
    emoji: '📈',
    category: 'tribelog',
    rconCommand: 'admin'
  },
  {
    sku: 'log_analytics',
    nombre: 'Analytics Avanzado',
    descripcion: 'Datos detallados de combates y eventos',
    precio: 14.99,
    emoji: '📡',
    category: 'tribelog',
    rconCommand: 'admin'
  },
  {
    sku: 'log_vigilancia',
    nombre: 'Sistema de Vigilancia 24/7',
    descripcion: 'Monitoreo continuo de tu tribu',
    precio: 19.99,
    emoji: '👁️',
    category: 'tribelog',
    rconCommand: 'admin'
  },
  {
    sku: 'log_prediccion',
    nombre: 'Predictor de Eventos',
    descripcion: 'Prevé ataques y eventos importantes',
    precio: 24.99,
    emoji: '🔮',
    category: 'tribelog',
    rconCommand: 'admin'
  },
  {
    sku: 'log_master',
    nombre: 'Master Log Pro',
    descripcion: 'El servicio más completo y poderoso',
    precio: 39.99,
    emoji: '⭐',
    category: 'tribelog',
    rconCommand: 'admin'
  }
];

async function seedProducts() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // Limpiar productos existentes
    await Product.deleteMany({});
    console.log('🗑️  Productos anteriores eliminados');

    // Insertar nuevos productos
    await Product.insertMany(productos);
    console.log(`✅ ${productos.length} productos insertados correctamente`);

    // Mostrar resumen
    const vips = await Product.countDocuments({ category: 'vips' });
    const kits = await Product.countDocuments({ category: 'kits' });
    const dinos = await Product.countDocuments({ category: 'dinos' });
    const blueprints = await Product.countDocuments({ category: 'blueprints' });
    const tribelog = await Product.countDocuments({ category: 'tribelog' });

    console.log(`
    📊 RESUMEN DE PRODUCTOS:
    ├─ VIPs: ${vips}
    ├─ Kits: ${kits}
    ├─ Dinosaurios: ${dinos}
    ├─ Blueprints: ${blueprints}
    └─ Tribe Log: ${tribelog}
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedProducts();