// public/assets/js/animated-background.js
class AnimatedBackground {
    constructor(containerSelector = 'body') {
        this.container = document.querySelector(containerSelector);
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.orbs = [];
        this.init();
    }

    init() {
        this.createCanvas();
        this.createOrbs();
        this.animate();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            pointer-events: none;
        `;
        
        const section = this.container.querySelector('section') || this.container;
        section.style.position = 'relative';
        section.insertBefore(this.canvas, section.firstChild);
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createOrbs() {
        const orbCount = 5;
        for (let i = 0; i < orbCount; i++) {
            this.orbs.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 80 + 60,
                color: ['rgba(255, 215, 0', 'rgba(197, 160, 89', 'rgba(16, 185, 129'][Math.floor(Math.random() * 3)],
                opacity: Math.random() * 0.1 + 0.05
            });
        }
    }

    updateOrbs() {
        this.orbs.forEach(orb => {
            orb.x += orb.vx;
            orb.y += orb.vy;

            if (orb.x - orb.radius < 0 || orb.x + orb.radius > this.canvas.width) {
                orb.vx *= -1;
            }
            if (orb.y - orb.radius < 0 || orb.y + orb.radius > this.canvas.height) {
                orb.vy *= -1;
            }
        });
    }

    drawOrbs() {
        this.orbs.forEach(orb => {
            const gradient = this.ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
            gradient.addColorStop(0, `${orb.color}, ${orb.opacity * 1.5})`);
            gradient.addColorStop(1, `${orb.color}, 0)`);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        });
    }

    animate = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateOrbs();
        this.drawOrbs();
        requestAnimationFrame(this.animate);
    }
}

// Exportar para uso global
window.AnimatedBackground = AnimatedBackground;