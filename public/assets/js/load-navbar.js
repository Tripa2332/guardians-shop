document.addEventListener('DOMContentLoaded', () => {
    // Cargar el navbar en el contenedor correcto
    fetch('../components/navbar.html')
        .then(response => response.text())
        .then(html => {
            const container = document.getElementById('navbar-container');
            if (container) {
                container.innerHTML = html;
                // Ejecutar DESPUÉS de insertar en el DOM
                initUserProfile();
                setupDropdownMenu();
            }
        });
});

function initUserProfile() {
    console.log('✅ initUserProfile() ejecutándose...');
    
    const user = localStorage.getItem('currentUser');
    console.log('Usuario en localStorage:', user);
    
    const btnAcceder = document.getElementById('btnAcceder');
    const userProfile = document.getElementById('userProfile');
    
    console.log('btnAcceder encontrado:', !!btnAcceder);
    console.log('userProfile encontrado:', !!userProfile);
    
    if (!btnAcceder || !userProfile) {
        console.warn('❌ Elementos del navbar no encontrados');
        return;
    }
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log('✅ Usuario parseado:', userData);
            
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
            console.error('❌ Error parseando datos del usuario:', e);
        }
    } else {
        console.log('⚠️ No hay usuario en localStorage');
    }
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
    localStorage.removeItem('currentUser');
    location.reload();
}