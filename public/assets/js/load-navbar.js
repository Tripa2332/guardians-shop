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
    checkUserLogin();
    setupLogoutEvent();
}

function checkUserLogin() {
    // Primero verificar en localStorage (para Steam)
    const user = localStorage.getItem('currentUser');
    
    if (user) {
        const userData = JSON.parse(user);
        showUserProfile(userData);
    } else {
        // Si no hay en localStorage, intentar obtener del servidor
        fetch('/api/user')
            .then(response => response.json())
            .then(userData => {
                if (userData) {
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    showUserProfile(userData);
                }
            })
            .catch(err => console.log('Usuario no autenticado'));
    }
}

function showUserProfile(userData) {
    const btnAcceder = document.getElementById('btnAcceder');
    const userProfile = document.getElementById('userProfile');
    
    if (btnAcceder) btnAcceder.classList.add('hidden');
    if (userProfile) {
        userProfile.classList.remove('hidden');
        const displayName = userData.name || 'Usuario';
        document.getElementById('userName').textContent = displayName;
        
        // Usar avatar de Steam o generar uno por defecto
        const avatarUrl = userData.avatar || 
            'https://via.placeholder.com/40/FFD700/1C1C1C?text=' + displayName.charAt(0);
        document.getElementById('userAvatar').src = avatarUrl;
    }
}

function setupDropdownMenu() {
    const userProfile = document.getElementById('userProfile');
    const dropdownMenu = document.getElementById('userDropdown');
    
    if (userProfile && dropdownMenu) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });

        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!userProfile.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.add('hidden');
            }
        });
    }
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