document.addEventListener('DOMContentLoaded', () => {
    // Cargar el navbar
    fetch('../components/navbar.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('afterbegin', html);
            // Ejecutar la lógica de login DESPUÉS de cargar el navbar
            initUserProfile();
            setupDropdownMenu();
        });
});

function initUserProfile() {
    const user = localStorage.getItem('currentUser');
    const btnAcceder = document.getElementById('btnAcceder');
    const userProfile = document.getElementById('userProfile');
    
    if (!btnAcceder || !userProfile) {
        console.warn('Elementos del navbar no encontrados');
        return;
    }
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            btnAcceder.classList.add('hidden');
            userProfile.classList.remove('hidden');
            
            const userAvatar = document.getElementById('userAvatar');
            const userName = document.getElementById('userName');
            
            if (userAvatar) userAvatar.src = userData.avatar;
            if (userName) userName.textContent = userData.name;
        } catch (e) {
            console.error('Error parseando datos del usuario:', e);
        }
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

function logout() {
    localStorage.removeItem('currentUser');
    // Redirigir a la ruta de logout del servidor
    window.location.href = '/logout';
}

function setupLogoutEvent() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('¿Deseas cerrar sesión?')) {
                logout();
            }
        });
    }
}