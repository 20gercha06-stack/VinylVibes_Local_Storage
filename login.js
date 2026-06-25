// ══════════════════════════════════════════════════════════
//  VinylVibes — login.js (versión localStorage)
//  Sin backend: lee/escribe usuarios en vv_usuarios
// ══════════════════════════════════════════════════════════

// ── HELPERS DE DATOS ──────────────────────────────
function getUsuarios() { return JSON.parse(localStorage.getItem('vv_usuarios') || '[]'); }
function setUsuarios(u) { localStorage.setItem('vv_usuarios', JSON.stringify(u)); }

document.addEventListener('DOMContentLoaded', function () {

    // ── LOGIN ─────────────────────────────────────────────
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const usuarioInput  = document.getElementById('username').value.trim();
            const passwordInput = document.getElementById('password').value;
            const mensajeError  = document.getElementById('mensaje-error-login');

            if (!usuarioInput || !passwordInput) {
                mostrarError(mensajeError, 'Por favor completa todos los campos.');
                return;
            }

            const submitBtn = loginForm.querySelector('[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Entrando…'; }

            // Pequeño delay para simular red
            await new Promise(r => setTimeout(r, 300));

            const usuarios = getUsuarios();
            const usuario  = usuarios.find(u => u.nombre === usuarioInput && u.password === passwordInput);

            if (usuario) {
                // Guardar datos de sesión en localStorage (mismas claves que el original)
                localStorage.setItem('vv_token',        'local_' + usuario.id_usuario);
                localStorage.setItem('usuarioLogueado', usuario.nombre);
                localStorage.setItem('esAdmin',         (usuario.rol === 'admin') ? 'true' : 'false');
                localStorage.setItem('esDemo',          (usuario.rol === 'demo')  ? 'true' : 'false');

                const base = window.location.pathname.replace('/login.html', '');
                window.location.href = base + '/index.html';
            } else {
                mostrarError(mensajeError, 'Usuario o contraseña incorrectos.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Entrar'; }
            }
        });
    }

    // ── REGISTRO ──────────────────────────────────────────
    const registroForm = document.getElementById('registro-form');
    if (registroForm) {
        registroForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const nuevoUsuario = document.getElementById('new-username').value.trim();
            const nuevoEmail   = document.getElementById('new-email')?.value.trim() || '';
            const nuevaPass    = document.getElementById('new-password').value;
            const mensajeReg   = document.getElementById('mensaje-registro')
                              || document.getElementById('mensaje-error-login');

            if (!nuevoUsuario || !nuevaPass) {
                mostrarError(mensajeReg, 'Por favor completa todos los campos.');
                return;
            }

            if (nuevaPass.length < 6) {
                mostrarError(mensajeReg, 'La contraseña debe tener al menos 6 caracteres.');
                return;
            }

            const submitBtn = registroForm.querySelector('[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Registrando…'; }

            await new Promise(r => setTimeout(r, 300));

            const usuarios = getUsuarios();

            if (usuarios.find(u => u.nombre === nuevoUsuario)) {
                mostrarError(mensajeReg, 'Ese nombre de usuario ya existe.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Crear cuenta'; }
                return;
            }

            const nuevoId = Date.now();
            usuarios.push({
                id_usuario: nuevoId,
                nombre:     nuevoUsuario,
                correo:     nuevoEmail,
                email:      nuevoEmail,
                password:   nuevaPass,
                rol:        'cliente',
                created_at: new Date().toISOString(),
            });
            setUsuarios(usuarios);

            mostrarExito(mensajeReg, '¡Cuenta creada! Ahora puedes iniciar sesión.');
            registroForm.reset();
            setTimeout(() => cambiarVista('login'), 1500);

            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Crear cuenta'; }
        });
    }
});

// ── Helpers de mensajes ───────────────────────────
function mostrarError(el, texto) {
    if (!el) return;
    el.innerText   = '' + texto;
    el.style.color = '#fca5a5';
}

function mostrarExito(el, texto) {
    if (!el) return;
    el.innerText   = texto;
    el.style.color = '#6ee7b7';
}
