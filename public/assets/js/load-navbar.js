document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 load-navbar.js ejecutándose...');
    
    // Cargar el navbar en el contenedor correcto
    fetch('../components/navbar.html')
        .then(response => response.text())
        .then(html => {
            const container = document.getElementById('navbar-container');
            if (container) {
                console.log('✅ Navbar inyectado en el DOM');
                container.innerHTML = html;
                
                // Ejecutar DESPUÉS de insertar en el DOM
                initUserProfile();
                setupDropdownMenu();
                
                // 🎯 INICIALIZAR CARRITO DESPUÉS DE CARGAR NAVBAR
                console.log('🛒 Llamando a initCartGlobal...');
                if (typeof window.initCartGlobal === 'function') {
                    window.initCartGlobal();
                } else {
                    console.warn('⚠️ initCartGlobal no está disponible aún');
                }
            }
        })
        .catch(err => console.error('❌ Error cargando navbar:', err));
});

function initUserProfile() {
    console.log('✅ initUserProfile() ejecutándose...');
    
    // Primero intentar obtener del servidor (más confiable)
    fetch('/api/perfil')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('No autenticado en servidor');
        })
        .then(user => {
            console.log('✅ Usuario del servidor:', user);
            localStorage.setItem('currentUser', JSON.stringify(user));
            actualizarUI(user);
        })
        .catch(err => {
            console.log('ℹ️ Usuario no en servidor, verificando localStorage:', err.message);
            
            // Fallback a localStorage
            const user = localStorage.getItem('currentUser');
            if (user) {
                try {
                    const userData = JSON.parse(user);
                    console.log('✅ Usuario en localStorage:', userData);
                    actualizarUI(userData);
                } catch (e) {
                    console.error('❌ Error parseando localStorage:', e);
                    limpiarUI();
                }
            } else {
                console.log('⚠️ No hay usuario en localStorage');
                limpiarUI();
            }
        });
}

function actualizarUI(userData) {
    const btnAcceder = document.getElementById('btnAcceder');
    const userProfile = document.getElementById('userProfile');
    
    if (!btnAcceder || !userProfile) {
        console.warn('❌ Elementos del navbar no encontrados');
        return;
    }
    
    try {
        console.log('🎨 Actualizando UI con usuario:', userData.name);
        
        btnAcceder.classList.add('hidden');
        userProfile.classList.remove('hidden');
        
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        
        if (userAvatar) {
            userAvatar.src = userData.avatar;
            console.log('✅ Avatar asignado:', userData.avatar);
        }
        if (userName) {
            userName.textContent = userData.name;
            console.log('✅ Nombre asignado:', userData.name);
        }
    } catch (e) {
        console.error('❌ Error actualizando UI:', e);
    }
}

function limpiarUI() {
    const btnAcceder = document.getElementById('btnAcceder');
    const userProfile = document.getElementById('userProfile');
    
    if (btnAcceder) btnAcceder.classList.remove('hidden');
    if (userProfile) userProfile.classList.add('hidden');
    
    localStorage.removeItem('currentUser');
}

function setupDropdownMenu() {
    const userProfile = document.getElementById('userProfile');
    const userDropdown = document.getElementById('userDropdown');
    
    if (!userProfile || !userDropdown) return;
    
    userProfile.addEventListener('click', () => {
        userDropdown.classList.toggle('hidden');
    });
}

function cerrarSesion() {
    console.log('🚪 Cerrando sesión...');
    
    fetch('/logout')
        .then(response => response.json())
        .then(data => {
            console.log('✅ Sesión cerrada:', data);
            localStorage.removeItem('currentUser');
            location.reload();
        })
        .catch(err => {
            console.error('❌ Error cerrando sesión:', err);
            localStorage.removeItem('currentUser');
            location.reload();
        });
}