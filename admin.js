// ══════════════════════════════════════════════════════════
//  VinylVibes — admin.js (versión localStorage)
//  Sin backend: lee/escribe usuarios y ventas en localStorage
// ══════════════════════════════════════════════════════════

// ── HELPERS DE DATOS ──────────────────────────────
function getUsuarios() { return JSON.parse(localStorage.getItem('vv_usuarios') || '[]'); }
function getVentas()   { return JSON.parse(localStorage.getItem('vv_ventas')   || '[]'); }
function setUsuarios(u) { localStorage.setItem('vv_usuarios', JSON.stringify(u)); }
function setVentas(v)   { localStorage.setItem('vv_ventas',   JSON.stringify(v)); }

// ── INIT ──────────────────────────────────────────
let _esDemo = false;

document.addEventListener('DOMContentLoaded', async () => {
    // En la versión local usamos 'usuarioLogueado' y 'esAdmin' igual que el original
    const usuario = localStorage.getItem('usuarioLogueado');
    const esAdmin = localStorage.getItem('esAdmin') === 'true';
    const esDemo  = localStorage.getItem('esDemo')  === 'true';

    if (!usuario || (!esAdmin && !esDemo)) {
        mostrarToast('Acceso denegado.', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    _esDemo = esDemo && !esAdmin;

    if (_esDemo) {
        const banner = document.createElement('div');
        banner.style.cssText = 'background:rgba(245,158,11,0.12);border-bottom:1px solid rgba(245,158,11,0.3);padding:8px 32px;text-align:center;font-size:0.8rem;color:var(--amber);font-family:"DM Mono",monospace;letter-spacing:0.05em;';
        banner.textContent = '👁 Modo solo lectura — esta cuenta no puede realizar cambios';
        document.querySelector('.admin-header').after(banner);
    }

    await Promise.all([cargarUsuarios(), cargarVentas()]);
    cargarStats();
});

// ── TABS ──────────────────────────────────────────
function cambiarTab(tab, btn) {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// ── STATS ─────────────────────────────────────────
async function cargarStats() {
    const usuarios = getUsuarios();
    const ventas   = getVentas();

    document.getElementById('stat-usuarios').textContent   = usuarios.length;
    document.getElementById('stat-ventas').textContent     = ventas.length;
    document.getElementById('stat-pendientes').textContent = ventas.filter(v => v.estado === 'pendiente').length;
    const ingresos = ventas.reduce((s, v) => s + Number(v.total), 0);
    document.getElementById('stat-ingresos').textContent   = `$${ingresos.toFixed(2)}`;
}

// ── USUARIOS ──────────────────────────────────────
let _usuarios = [];

async function cargarUsuarios() {
    // Mapea campos locales a los que espera renderizarUsuarios
    _usuarios = getUsuarios().map(u => ({
        id_usuario: u.id_usuario,
        nombre:     u.nombre,
        correo:     u.correo || u.email || '—',
        rol:        u.rol,
        created_at: u.created_at || u.creado || null,
    }));
    renderizarUsuarios(_usuarios);
}

function renderizarUsuarios(lista) {
    const loading = document.getElementById('tabla-loading');
    const tabla   = document.getElementById('tabla-usuarios');
    const tbody   = document.getElementById('tbody-usuarios');

    if (loading) loading.style.display = 'none';
    if (tabla)   tabla.style.display   = 'table';

    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">No hay usuarios.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(u => `
        <tr>
            <td style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.75rem;">#${u.id_usuario}</td>
            <td style="color:var(--text-primary);font-weight:500;">${u.nombre}</td>
            <td>${u.correo || '—'}</td>
            <td><span class="badge badge--${u.rol}">${u.rol}</span></td>
            <td style="color:var(--text-muted);font-size:0.8rem;">${formatearFecha(u.created_at)}</td>
            <td>
                ${_esDemo ? `
                <select class="select-rol" disabled style="opacity:0.4;cursor:not-allowed;">
                    <option>${u.rol}</option>
                </select>
                <button class="btn-table btn-table--danger" disabled style="opacity:0.4;cursor:not-allowed;">Eliminar</button>
                ` : `
                <select class="select-rol" onchange="cambiarRol(${u.id_usuario}, this.value)">
                    <option value="cliente"  ${u.rol === 'cliente'  ? 'selected' : ''}>cliente</option>
                    <option value="vendedor" ${u.rol === 'vendedor' ? 'selected' : ''}>vendedor</option>
                    <option value="admin"    ${u.rol === 'admin'    ? 'selected' : ''}>admin</option>
                </select>
                <button class="btn-table btn-table--danger" onclick="confirmarEliminarUsuario(${u.id_usuario}, '${u.nombre}')">Eliminar</button>
                `}
            </td>
        </tr>`).join('');
}

function filtrarUsuarios(q) {
    const filtrados = q
        ? _usuarios.filter(u =>
            u.nombre.toLowerCase().includes(q.toLowerCase()) ||
            (u.correo || '').toLowerCase().includes(q.toLowerCase()))
        : _usuarios;
    renderizarUsuarios(filtrados);
}

async function cambiarRol(id, nuevoRol) {
    // Proteger al admin actual
    const usuarioActual = localStorage.getItem('usuarioLogueado');
    const yo = _usuarios.find(u => u.nombre === usuarioActual);
    if (yo && yo.id_usuario === id && nuevoRol !== 'admin') {
        mostrarToast('No puedes quitarte el rol de admin.', 'error');
        await cargarUsuarios();
        return;
    }

    const todos = getUsuarios();
    const u = todos.find(u => u.id_usuario === id);
    if (u) {
        u.rol = nuevoRol;
        setUsuarios(todos);
        mostrarToast(`Rol actualizado a "${nuevoRol}".`, 'success');
        await cargarUsuarios();
    } else {
        mostrarToast('Usuario no encontrado.', 'error');
    }
}

function confirmarEliminarUsuario(id, nombre) {
    const filas = document.querySelectorAll('#tbody-usuarios tr');
    filas.forEach(fila => {
        const idCelda = fila.querySelector('td:first-child');
        if (idCelda && idCelda.textContent === `#${id}`) {
            const accionesTd = fila.querySelector('td:last-child');
            accionesTd.innerHTML = `
                <span style="font-size:0.8rem;color:var(--text-muted);margin-right:8px;">¿Eliminar a "${nombre}"?</span>
                <button class="btn-table btn-table--danger" onclick="eliminarUsuario(${id}, '${nombre}')">Confirmar</button>
                <button class="btn-table" onclick="renderizarUsuarios(_usuarios)">Cancelar</button>`;
        }
    });
}

async function eliminarUsuario(id, nombre) {
    const todos = getUsuarios().filter(u => u.id_usuario !== id);
    setUsuarios(todos);
    mostrarToast(`Usuario "${nombre}" eliminado.`, 'success');
    _usuarios = _usuarios.filter(u => u.id_usuario !== id);
    renderizarUsuarios(_usuarios);
    cargarStats();
}

// ── VENTAS ────────────────────────────────────────
let _ventas = [];

async function cargarVentas() {
    // Mapea campos locales a los que espera renderizarVentas
    _ventas = getVentas().map(v => ({
        id_venta:  v.id_venta,
        cliente:   v.cliente,
        total:     v.total,
        estado:    v.estado,
        fecha:     v.fecha,
        discos:    v.discos || [],
        envio:     v.envio  || null,
    })).reverse();
    renderizarVentas(_ventas);
}

function renderizarVentas(lista) {
    const loading = document.getElementById('tabla-ventas-loading');
    const tabla   = document.getElementById('tabla-ventas');
    const tbody   = document.getElementById('tbody-ventas');

    if (loading) loading.style.display = 'none';
    if (tabla)   tabla.style.display   = 'table';

    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">No hay ventas.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(v => `
        <tr>
            <td style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.75rem;">#${v.id_venta}</td>
            <td style="color:var(--text-primary);font-weight:500;">${v.cliente?.nombre || '—'}</td>
            <td style="color:var(--amber);font-weight:600;">$${Number(v.total).toFixed(2)}</td>
            <td><span class="badge badge--${v.estado}">${v.estado}</span></td>
            <td style="color:var(--text-muted);font-size:0.8rem;">${formatearFecha(v.fecha)}</td>
            <td>
                <button class="btn-table" onclick="verDetalleVenta(${v.id_venta})">Ver detalle</button>
                ${_esDemo ? `
                <select class="select-rol" disabled style="opacity:0.4;cursor:not-allowed;">
                    <option>${v.estado}</option>
                </select>
                ` : `
                <select class="select-rol" onchange="cambiarEstadoVenta(${v.id_venta}, this.value)">
                    <option value="pendiente"  ${v.estado === 'pendiente'  ? 'selected' : ''}>pendiente</option>
                    <option value="pagada"     ${v.estado === 'pagada'     ? 'selected' : ''}>pagada</option>
                    <option value="enviada"    ${v.estado === 'enviada'    ? 'selected' : ''}>enviada</option>
                    <option value="entregada"  ${v.estado === 'entregada'  ? 'selected' : ''}>entregada</option>
                    <option value="cancelada"  ${v.estado === 'cancelada'  ? 'selected' : ''}>cancelada</option>
                </select>
                `}
            </td>
        </tr>`).join('');
}

function filtrarVentas(q) {
    const filtrados = q
        ? _ventas.filter(v =>
            String(v.id_venta).includes(q) ||
            (v.cliente?.nombre || '').toLowerCase().includes(q.toLowerCase()))
        : _ventas;
    renderizarVentas(filtrados);
}

async function cambiarEstadoVenta(id, nuevoEstado) {
    const todos = getVentas();
    const v = todos.find(v => v.id_venta === id);
    if (v) {
        v.estado = nuevoEstado;
        setVentas(todos);
        mostrarToast(`Estado actualizado a "${nuevoEstado}".`, 'success');
        // Actualizar cache en memoria
        const inMem = _ventas.find(v => v.id_venta === id);
        if (inMem) inMem.estado = nuevoEstado;
        cargarStats();
    } else {
        mostrarToast('Venta no encontrada.', 'error');
    }
}

async function verDetalleVenta(id) {
    const venta = _ventas.find(v => v.id_venta === id);
    if (!venta) return;

    const lineas = venta.discos || [];
    const envio  = venta.envio  || null;

    document.getElementById('venta-detalle-body').innerHTML = `
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;">
            Venta #${id} · ${venta.cliente?.nombre || '—'} · <span class="badge badge--${venta.estado}">${venta.estado}</span>
        </p>
        <p style="font-size:0.85rem;font-weight:600;margin-bottom:8px;color:var(--text-muted);">DISCOS</p>
        ${lineas.map(l => `
            <div class="venta-item">
                <span>${l.titulo} <span style="color:var(--text-muted);font-size:0.8rem;">x${l.cantidad}</span></span>
                <span>$${Number(l.subtotal).toFixed(2)}</span>
            </div>`).join('')}
        <div class="venta-item" style="font-weight:700;color:var(--amber);">
            <span>Total</span>
            <span>$${Number(venta.total).toFixed(2)}</span>
        </div>
        ${envio ? `
        <p style="font-size:0.85rem;font-weight:600;margin:16px 0 8px;color:var(--text-muted);">ENVÍO</p>
        <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;">
            ${envio.nombre_receptor}<br>
            ${envio.calle} ${envio.numero_ext}${envio.numero_int ? ' Int. '+envio.numero_int : ''}<br>
            ${envio.colonia}, ${envio.ciudad}, ${envio.estado} ${envio.codigo_postal}
            ${envio.referencias ? `<br><span style="color:var(--text-muted);">${envio.referencias}</span>` : ''}
        </p>` : ''}`;

    document.getElementById('modal-venta').classList.add('open');
}

function cerrarModalVenta() {
    document.getElementById('modal-venta').classList.remove('open');
}

// ── HELPERS ───────────────────────────────────────
function formatearFecha(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-MX', {
        day:   '2-digit',
        month: 'short',
        year:  'numeric',
    });
}

function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colores = { success: '#6ee7b7', error: '#fca5a5', warning: '#fcd34d', info: '#93c5fd' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${tipo}`;
    toast.style.cssText = `position:fixed;bottom:24px;right:24px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:10px;padding:12px 18px;font-size:0.875rem;color:${colores[tipo]};box-shadow:0 8px 24px rgba(0,0,0,0.3);z-index:9999;transition:all 0.3s;opacity:0;transform:translateY(10px);`;
    toast.textContent = mensaje;
    container.appendChild(toast);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }));

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
