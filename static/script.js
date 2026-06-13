// Global State
let localLeads = [];
let originalLeads = [];
let currentNicho = "", currentCiudad = "", currentZona = "";

// DOM Elements
const prospectForm = document.getElementById("prospectForm");
const submitBtn = document.getElementById("submitBtn");
const modifySearchBtn = document.getElementById("modifySearchBtn");
const loadingOverlay = document.getElementById("loadingOverlay");
const emptyState = document.getElementById("emptyState");
const tableContainer = document.getElementById("tableContainer");
const leadsTableBody = document.getElementById("leadsTableBody");
const exportBtn = document.getElementById("exportBtn");
const searchBreadcrumb = document.getElementById("searchBreadcrumb");
const statsPanel = document.getElementById("statsPanel");
const statLeads = document.getElementById("statLeads");
const statContactados = document.getElementById("statContactados");

const serviceInput = document.getElementById("servicio");
const serviceError = document.getElementById("servicioError");

// Toast Notification
function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    const toastIcon = document.getElementById("toastIcon");
    const toastMessage = document.getElementById("toastMessage");
    
    // Set icon based on type
    toastIcon.className = "fa-solid";
    if (type === "success") {
        toastIcon.classList.add("fa-circle-check");
        toast.className = "toast toast-success";
    } else if (type === "error") {
        toastIcon.classList.add("fa-circle-exclamation");
        toast.className = "toast toast-error";
    } else {
        toastIcon.classList.add("fa-circle-info");
        toast.className = "toast toast-info";
    }
    
    toastMessage.textContent = message;
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

// Palabras clave permitidas para validación
const ALLOWED_KEYWORDS = [
    "web", "pagina", "página", "sitio", "desarrollo", "programador", "programacion", "programación",
    "software", "app", "aplicacion", "aplicación",
    "community", "redes", "social", "instagram", "facebook", "post", "contenido", "feed", "stories",
    "diseño", "diseno", "grafico", "gráfico", "branding", "identidad", "logo", "logotipo",
    "marketing", "publicidad", "ads", "anuncios", "seo", "google ads", "facebook ads", "tráfico", "trafico", "growth",
    "copywriting", "redaccion", "redacción", "copywriter", "copy",
    "empleado", "empleada", "trabajar", "puesto", "recepcion", "recepción", "recepcionista", "asistente",
    "secretaria", "secretario", "administra", "administración", "administracion", "soporte", "atencion", "atención",
    "ventas", "vendedor", "vendedora", "comercial", "setter", "closer", "telemarketer",
    "fotografia", "fotografía", "video", "edicion", "edición", "filmmaker", "camara", "cámara", "audiovisual"
];

function clientValidateService(service) {
    if (!service) return false;
    const clean = service.toLowerCase().trim();
    for (const keyword of ALLOWED_KEYWORDS) {
        if (clean.includes(keyword)) {
            return true;
        }
    }
    return false;
}

function checkServiceInput() {
    const value = serviceInput.value.trim();
    if (value === "") {
        serviceError.style.display = "none";
        return true; // Validadores nativos requeridos harán lo suyo
    }
    
    const isValid = clientValidateService(value);
    if (!isValid) {
        serviceError.style.display = "flex";
        serviceInput.style.borderColor = "var(--danger)";
        return false;
    } else {
        serviceError.style.display = "none";
        serviceInput.style.borderColor = "";
        return true;
    }
}

// Escuchar cambios en el input de servicio
serviceInput.addEventListener("input", checkServiceInput);
serviceInput.addEventListener("blur", checkServiceInput);

// Form Submission
prospectForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const nicho = document.getElementById("nicho").value.trim();
    const ciudad = document.getElementById("ciudad").value.trim();
    const zona = document.getElementById("zona").value.trim();
    const servicio = serviceInput.value.trim();
    const cantidad = document.getElementById("cantidad").value;
    const apiKey = document.getElementById("geminiApiKey") ? document.getElementById("geminiApiKey").value.trim() : "";
    const estiloMensaje = document.getElementById("estiloMensaje").value;
    
    // 1. Estado de autenticación
    if (!usuarioLogueado) {
        showToast("Por favor, iniciá sesión para poder realizar prospecciones.", "info");
        setTimeout(() => {
            window.location.href = "/login?redirected=true";
        }, 1500);
        return;
    }
    
    // 2. Control de límites según plan
    const cantidadSolicitada = parseInt(cantidad) || 20;
    if (tipoPlan === "free") {
        if (leadsConsumidosHoy + cantidadSolicitada > 40) {
            showToast("Esta consulta supera el límite de 40 leads diarios de tu plan gratuito. Pásate a Premium para buscar sin restricciones.", "error");
            openPremiumModal();
            return;
        }
    }
    
    // Validar el servicio antes de enviar
    if (!checkServiceInput()) {
        showToast("Servicio no válido. Introduce un servicio típico como 'Desarrollo Web' o 'Community Manager'.", "error");
        serviceInput.focus();
        return;
    }
    
    // UI Loading State
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
    loadingOverlay.style.display = "flex";
    
    try {
        const response = await fetch("/api/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nicho: nicho,
                ciudad: ciudad,
                zona: zona,
                servicio: servicio,
                cantidad: cantidad,
                api_key: apiKey,
                estilo_mensaje: estiloMensaje
            })
        });
        
        let result;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        } else {
            const textError = await response.text();
            console.error("Server HTML Response:", textError);
            showToast(`Error del servidor (${response.status}): Respuesta no válida del servidor.`, "error");
            renderEmptyState();
            return;
        }
        
        if (response.ok && result.status === "success") {
            localLeads = result.data;
            originalLeads = [...result.data];
            
            // Mostrar/ocultar banner de advertencia según si la API key está disponible (servidor o UI)
            const warningBanner = document.getElementById("apiKeyWarningBanner");
            if (warningBanner) {
                if (result.gemini_api_key_configured || apiKey) {
                    warningBanner.style.display = "none";
                } else {
                    warningBanner.style.display = "flex";
                }
            }
            currentNicho = nicho;
            currentCiudad = ciudad;
            currentZona = zona;
            
            // Reset filters on new search
            const hidePremiumCheckbox = document.getElementById("hidePremiumLeads");
            const sortLeadsSelect = document.getElementById("sortLeads");
            if (hidePremiumCheckbox) hidePremiumCheckbox.checked = false;
            if (sortLeadsSelect) sortLeadsSelect.value = "default";
            
            if (localLeads.length === 0) {
                // Empty results
                showToast("Búsqueda completada, pero no se encontraron leads con teléfono registrado.", "info");
                renderEmptyState();
            } else {
                // Actualizar leads consumidos con el valor devuelto por el servidor
                if (tipoPlan === "free" && result.leads_consumed_today !== undefined) {
                    leadsConsumidosHoy = result.leads_consumed_today;
                    localStorage.setItem("clientmagnet-leads-consumed", leadsConsumidosHoy);
                    renderAuthSection();
                }
                showToast(`Se cargaron ${localLeads.length} leads exitosamente.`, "success");
                renderLeads(nicho, ciudad, zona);
                lockSearchFields();
            }
        } else {
            if (result && result.code === "LIMIT_EXCEEDED") {
                showToast(result.message, "error");
                openPremiumModal();
            } else {
                showToast((result && result.message) || "Error al realizar la búsqueda.", "error");
            }
            renderEmptyState();
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        showToast("Error de conexión con el servidor local. Verifique que la aplicación esté corriendo.", "error");
        renderEmptyState();
    } finally {
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
        loadingOverlay.style.display = "none";
    }
});

function renderEmptyState() {
    emptyState.style.display = "flex";
    tableContainer.style.display = "none";
    exportBtn.disabled = true;
    statsPanel.style.display = "none";
    document.getElementById("filterBar").style.display = "none";
    searchBreadcrumb.textContent = "Inicia una búsqueda para extraer prospectos de Google Maps";
}

// Helper to determine color classes for quality score
function getCalidadClass(score) {
    if (score < 45) return "critico";
    if (score < 70) return "regular";
    return "excelente";
}

// Render Leads Table
function renderLeads(nicho, ciudad, zona) {
    emptyState.style.display = "none";
    tableContainer.style.display = "block";
    exportBtn.disabled = false;
    statsPanel.style.display = "block";
    
    // Mostrar barra de filtros sin resetear sus estados
    const filterBar = document.getElementById("filterBar");
    const hidePremiumCheckbox = document.getElementById("hidePremiumLeads");
    if (filterBar) filterBar.style.display = "flex";
    
    const hidePremium = hidePremiumCheckbox ? hidePremiumCheckbox.checked : false;
    let visibleCount = 0;
    
    searchBreadcrumb.innerHTML = `Resultados para: <strong>${nicho}</strong> en <strong>${zona}, ${ciudad}</strong>`;
    
    leadsTableBody.innerHTML = "";
    
    localLeads.forEach((lead, index) => {
        const tr = document.createElement("tr");
        tr.id = `row-${index}`;
        
        // Mantener la clase de estado correcta
        const statusClass = lead.status === "[Pendiente]" ? "status-pendiente" :
                            lead.status === "[Contactado]" ? "status-contactado" :
                            lead.status === "[Sin Respuesta]" ? "status-sin-respuesta" :
                            lead.status === "[Interesado]" ? "status-interesado" :
                            lead.status === "[Rechazado]" ? "status-rechazado" : "status-pendiente";
        tr.className = statusClass;
        
        const calidadClass = getCalidadClass(lead.calidad_score);
        
        // Aplicar filtro de premium si está activo
        const shouldHide = hidePremium && (lead.calidad_score > 70);
        if (shouldHide) {
            tr.style.display = "none";
        } else {
            tr.style.display = "";
            visibleCount++;
        }
        
        tr.innerHTML = `
            <td data-label="Negocio">
                <div class="business-name">${lead.name}</div>
                <div class="business-links-container" style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
                    ${lead.website ? (
                        (lead.website.includes("instagram.com") || lead.website.includes("facebook.com") || lead.website.includes("wa.link") || lead.website.includes("whatsapp.com") || lead.website.includes("linktr.ee"))
                        ? `
                            <a href="${lead.website}" target="_blank" class="business-link" style="color: var(--warning); display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fa-solid fa-triangle-exclamation"></i> Solo Redes (Sin Web)
                            </a>
                          `
                        : `
                            <a href="${lead.website}" target="_blank" class="business-link" style="display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fa-solid fa-globe"></i> Ver Sitio Web
                            </a>
                          `
                    ) : `
                        <div style="font-size: 11px; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fa-solid fa-link-slash"></i> Sin Sitio Web
                        </div>
                    `}
                    ${lead.instagram ? `
                        <a href="${lead.instagram}" target="_blank" class="business-link instagram-link" style="color: #e1306c; display: inline-flex; align-items: center; gap: 4px; font-weight: 500;">
                            <i class="fa-brands fa-instagram"></i> Ver Instagram
                        </a>
                    ` : ''}
                    ${(!lead.instagram && lead.facebook) ? `
                        <a href="${lead.facebook}" target="_blank" class="business-link facebook-link" style="color: #1877f2; display: inline-flex; align-items: center; gap: 4px; font-weight: 500;">
                            <i class="fa-brands fa-facebook-f"></i> Ver Facebook
                        </a>
                    ` : ''}
                </div>
            </td>
            <td data-label="Teléfono">
                <div class="phone-raw">${lead.phone_original}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">WSP: +${lead.phone_clean}</div>
            </td>
            <td data-label="Calidad">
                <div class="calidad-wrapper">
                    <div class="calidad-header-row">
                        <span class="calidad-num">${lead.calidad_score}%</span>
                        <span class="calidad-badge ${calidadClass}">${lead.calidad_motivo}</span>
                    </div>
                    <div class="calidad-bar-container">
                        <div class="calidad-bar ${calidadClass}" id="bar-${index}" style="width: 0%;"></div>
                    </div>
                </div>
            </td>
            <td data-label="Ubicación">
                <div class="address-text" title="${lead.address}">${lead.address}</div>
            </td>
            <td data-label="Propuesta">
                <div class="proposal-box">
                    <textarea class="proposal-textarea" id="textarea-${index}">${lead.message}</textarea>
                    <div class="proposal-actions">
                        <button class="btn-mini" onclick="copyProposal(${index})" title="Copiar al portapapeles"><i class="fa-solid fa-copy"></i></button>
                    </div>
                </div>
            </td>
            <td data-label="Acción" style="text-align: center;">
                <a href="${lead.whatsapp_link}" target="_blank" class="btn-send-whatsapp" id="whatsapp-btn-${index}" onclick="markAsContacted(${index})">
                    <i class="fa-brands fa-whatsapp"></i> Enviar
                </a>
            </td>
            <td data-label="Estado">
                <select class="status-select" id="select-${index}" onchange="updateStatus(${index}, this.value)">
                    <option value="[Pendiente]" ${lead.status === "[Pendiente]" ? "selected" : ""}>Pendiente</option>
                    <option value="[Contactado]" ${lead.status === "[Contactado]" ? "selected" : ""}>Contactado</option>
                    <option value="[Sin Respuesta]" ${lead.status === "[Sin Respuesta]" ? "selected" : ""}>Sin Respuesta</option>
                    <option value="[Interesado]" ${lead.status === "[Interesado]" ? "selected" : ""}>Interesado</option>
                    <option value="[Rechazado]" ${lead.status === "[Rechazado]" ? "selected" : ""}>Rechazado</option>
                </select>
            </td>
        `;
        
        leadsTableBody.appendChild(tr);
        
        // Trigger cool bar animation
        setTimeout(() => {
            const bar = document.getElementById(`bar-${index}`);
            if (bar) bar.style.width = `${lead.calidad_score}%`;
        }, 150);
        
        // Add live edit listener to textarea to dynamically update the WhatsApp link and local state
        const textarea = tr.querySelector(`#textarea-${index}`);
        textarea.addEventListener("input", function() {
            const newText = this.value;
            localLeads[index].message = newText;
            
            // Re-encode and update WhatsApp link href
            const cleanPhone = localLeads[index].phone_clean;
            const newLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(newText)}`;
            localLeads[index].whatsapp_link = newLink;
            
            document.getElementById(`whatsapp-btn-${index}`).href = newLink;
        });
    });
    
    // Actualizar texto informativo de filtros
    const filterInfo = document.getElementById("filterInfo");
    if (filterInfo) {
        if (hidePremium) {
            const hiddenCount = localLeads.length - visibleCount;
            filterInfo.textContent = `Omitidos ${hiddenCount} prospectos premium. Mostrando ${visibleCount} leads críticos/medios.`;
        } else {
            filterInfo.textContent = `Mostrando todos los ${localLeads.length} leads.`;
        }
    }
    
    updateMetrics();
}

// Copy Proposal to Clipboard
window.copyProposal = function(index) {
    const textarea = document.getElementById(`textarea-${index}`);
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(textarea.value)
        .then(() => {
            showToast("Propuesta copiada al portapapeles.", "success");
        })
        .catch(err => {
            console.error("Clipboard Error:", err);
            showToast("No se pudo copiar el texto.", "error");
        });
};

// Mark as Contacted on Whatsapp link click
window.markAsContacted = function(index) {
    const select = document.getElementById(`select-${index}`);
    if (select.value === "[Pendiente]") {
        select.value = "[Contactado]";
        updateStatus(index, "[Contactado]");
    }
};

// Update Row Status
window.updateStatus = function(index, value) {
    localLeads[index].status = value;
    
    const tr = document.getElementById(`row-${index}`);
    tr.className = ""; // clear all
    
    if (value === "[Pendiente]") tr.classList.add("status-pendiente");
    else if (value === "[Contactado]") tr.classList.add("status-contactado");
    else if (value === "[Sin Respuesta]") tr.classList.add("status-sin-respuesta");
    else if (value === "[Interesado]") tr.classList.add("status-interesado");
    else if (value === "[Rechazado]") tr.classList.add("status-rechazado");
    
    updateMetrics();
};

// Recalculate Metrics based on visible filtered leads
function updateMetrics() {
    const hidePremium = document.getElementById("hidePremiumLeads").checked;
    const filteredLeads = hidePremium 
        ? localLeads.filter(lead => lead.calidad_score <= 70) 
        : localLeads;

    statLeads.textContent = filteredLeads.length;
    
    const contactedCount = filteredLeads.filter(lead => lead.status !== "[Pendiente]").length;
    statContactados.textContent = contactedCount;
}

// Export to Excel
exportBtn.addEventListener("click", async function() {
    if (localLeads.length === 0) return;
    
    exportBtn.disabled = true;
    const originalContent = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando Excel...';
    
    try {
        const response = await fetch("/api/export", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: localLeads
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Prospectos_${new Date().toISOString().slice(0,10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast("Planilla Excel exportada exitosamente.", "success");
        } else {
            showToast("Error al exportar el archivo de Excel.", "error");
        }
    } catch (error) {
        console.error("Export Error:", error);
        showToast("Error de conexión al exportar.", "error");
    } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalContent;
    }
});

// Accordion de la guía contra spam
const spamGuideToggle = document.getElementById("spamGuideToggle");
const spamGuideContent = document.getElementById("spamGuideContent");
const spamGuideCard = document.querySelector(".spam-guide-card");

if (spamGuideToggle && spamGuideContent && spamGuideCard) {
    spamGuideToggle.addEventListener("click", function() {
        const isOpen = spamGuideContent.style.display === "block";
        spamGuideContent.style.display = isOpen ? "none" : "block";
        spamGuideCard.classList.toggle("open", !isOpen);
    });
}

// Accordion de Ajustes Avanzados
const advancedToggle = document.getElementById("advancedToggle");
const advancedContent = document.getElementById("advancedContent");
const advancedCard = document.querySelector(".advanced-settings-card");

if (advancedToggle && advancedContent && advancedCard) {
    advancedToggle.addEventListener("click", function() {
        const isOpen = advancedContent.style.display === "block";
        advancedContent.style.display = isOpen ? "none" : "block";
        advancedCard.classList.toggle("open", !isOpen);
    });
}

// Cargar y persistir Gemini API Key en localStorage
const geminiApiKeyInput = document.getElementById("geminiApiKey");
if (geminiApiKeyInput) {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) {
        geminiApiKeyInput.value = savedKey;
    }
    geminiApiKeyInput.addEventListener("input", function() {
        localStorage.setItem("gemini_api_key", geminiApiKeyInput.value.trim());
    });
}

// Filtro y Ordenación Interactiva de Leads
function applyFiltersAndSort() {
    if (localLeads.length === 0) return;
    
    const sortVal = document.getElementById("sortLeads").value;
    if (sortVal === "score-desc") {
        localLeads.sort((a, b) => b.calidad_score - a.calidad_score);
    } else if (sortVal === "score-asc") {
        localLeads.sort((a, b) => a.calidad_score - b.calidad_score);
    } else {
        // Restaurar orden por defecto de la búsqueda original
        localLeads = [...originalLeads];
    }
    
    // Volver a renderizar la tabla manteniendo la paginación/búsqueda actual
    renderLeads(currentNicho, currentCiudad, currentZona);
}

const hidePremiumCheckbox = document.getElementById("hidePremiumLeads");
if (hidePremiumCheckbox) {
    hidePremiumCheckbox.addEventListener("change", applyFiltersAndSort);
}

const sortLeadsSelect = document.getElementById("sortLeads");
if (sortLeadsSelect) {
    sortLeadsSelect.addEventListener("change", applyFiltersAndSort);
}

// Lógica de cambio de tema (ClientMagnet)
const themeButtons = document.querySelectorAll(".theme-btn");
const savedTheme = localStorage.getItem("clientmagnet-theme") || "theme-violet";

function applyTheme(themeName) {
    document.body.classList.remove("theme-light", "theme-dark", "theme-violet");
    document.body.classList.add(themeName);
    localStorage.setItem("clientmagnet-theme", themeName);
    
    themeButtons.forEach(btn => {
        if (btn.getAttribute("data-theme") === themeName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

themeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const theme = btn.getAttribute("data-theme");
        applyTheme(theme);
    });
});

applyTheme(savedTheme);

// Auth & Subscription SaaS Logic
let usuarioLogueado = false;
let tipoPlan = "free";
let leadsConsumidosHoy = 15;
let emailUsuario = "";
let nombreUsuario = "";
let fotoUsuario = "";

const authSection = document.getElementById("authSection");
const premiumModal = document.getElementById("premiumModal");
const closePremiumModal = document.getElementById("closePremiumModal");
const btnUpgradeAction = document.getElementById("btnUpgradeAction");

function clearLocalState() {
    usuarioLogueado = false;
    tipoPlan = "free";
    leadsConsumidosHoy = 15;
    emailUsuario = "";
    nombreUsuario = "";
    fotoUsuario = "";
    
    localStorage.removeItem("clientmagnet-logged-in");
    localStorage.removeItem("clientmagnet-user-name");
    localStorage.removeItem("clientmagnet-user-email");
    localStorage.removeItem("clientmagnet-plan-type");
    localStorage.removeItem("clientmagnet-leads-consumed");
}

async function checkSession() {
    try {
        const response = await fetch("/api/auth/session");
        const result = await response.json();
        if (response.ok && result.status === "success") {
            usuarioLogueado = true;
            tipoPlan = result.user.plan;
            leadsConsumidosHoy = result.user.leads_consumed;
            emailUsuario = result.user.email;
            nombreUsuario = result.user.name;
            fotoUsuario = result.user.picture;
            
            // Sincronizar localmente
            localStorage.setItem("clientmagnet-logged-in", "true");
            localStorage.setItem("clientmagnet-user-name", nombreUsuario);
            localStorage.setItem("clientmagnet-user-email", emailUsuario);
            localStorage.setItem("clientmagnet-plan-type", tipoPlan);
            localStorage.setItem("clientmagnet-leads-consumed", leadsConsumidosHoy);
        } else {
            clearLocalState();
        }
    } catch (e) {
        console.error("Session check error, falling back to localStorage", e);
        usuarioLogueado = localStorage.getItem("clientmagnet-logged-in") === "true";
        tipoPlan = localStorage.getItem("clientmagnet-plan-type") || "free";
        leadsConsumidosHoy = parseInt(localStorage.getItem("clientmagnet-leads-consumed")) || 15;
        emailUsuario = localStorage.getItem("clientmagnet-user-email") || "";
        nombreUsuario = localStorage.getItem("clientmagnet-user-name") || "";
        fotoUsuario = "";
    }
    renderAuthSection();
}

function renderAuthSection() {
    if (!authSection) return;
    
    if (!usuarioLogueado) {
        authSection.innerHTML = `
            <a href="/login" class="btn-google-login btn-mi-cuenta" id="btnMiCuenta" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-regular fa-user"></i> Mi Cuenta
            </a>
        `;
    } else {
        const initials = nombreUsuario.split(" ").map(n => n[0]).join("");
        const planText = tipoPlan === "premium" ? "Premium" : "Gratuito";
        const badgeClass = tipoPlan === "premium" ? "premium" : "free";
        const badgeTooltip = tipoPlan === "premium" ? "Tu plan no tiene límites de prospección diaria" : "Límite diario: 40 leads. Haz clic para subir a Premium.";
        
        let avatarHTML = `<div class="user-avatar" title="${nombreUsuario}">${initials}</div>`;
        if (fotoUsuario) {
            avatarHTML = `<div class="user-avatar user-avatar-image" style="background-image: url('${fotoUsuario}'); background-size: cover; background-position: center; color: transparent;" title="${nombreUsuario}">${initials}</div>`;
        }
        
        authSection.innerHTML = `
            <div class="auth-profile">
                ${avatarHTML}
                <div class="user-details">
                    <span class="user-name">${nombreUsuario}</span>
                    <span class="user-email">${emailUsuario}</span>
                </div>
                <span class="plan-badge ${badgeClass}" id="planBadge" title="${badgeTooltip}">${planText}</span>
                <button type="button" class="btn-logout" id="btnLogout" title="Cerrar sesión">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        `;
        
        document.getElementById("btnLogout").addEventListener("click", async () => {
            try {
                await fetch("/api/auth/logout", { method: "POST" });
            } catch (e) {
                console.error("Logout request failed", e);
            }
            clearLocalState();
            showToast("Sesión cerrada.", "info");
            renderAuthSection();
        });
        
        const planBadge = document.getElementById("planBadge");
        if (planBadge && tipoPlan === "free") {
            planBadge.addEventListener("click", openPremiumModal);
        }
    }
}

function openPremiumModal() {
    if (premiumModal) {
        premiumModal.style.display = "flex";
    }
}

function closePremiumModalWindow() {
    if (premiumModal) {
        premiumModal.style.display = "none";
    }
}

if (closePremiumModal) {
    closePremiumModal.addEventListener("click", closePremiumModalWindow);
}

if (premiumModal) {
    premiumModal.addEventListener("click", (e) => {
        if (e.target === premiumModal) {
            closePremiumModalWindow();
        }
    });
}

if (btnUpgradeAction) {
    btnUpgradeAction.addEventListener("click", async () => {
        try {
            const response = await fetch("/api/upgrade", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const result = await response.json();
            if (response.ok && result.status === "success") {
                tipoPlan = "premium";
                localStorage.setItem("clientmagnet-plan-type", "premium");
                showToast("¡Felicidades! Activaste tu suscripción Premium ($2000 ARS/mes). Búsquedas ilimitadas desbloqueadas.", "success");
                closePremiumModalWindow();
                renderAuthSection();
            } else {
                showToast(result.message || "Error al actualizar a Premium.", "error");
            }
        } catch (e) {
            console.error("Upgrade error:", e);
            showToast("Error de conexión al procesar suscripción.", "error");
        }
    });
}

// Mobile Sidebar Drawer Toggle Logic
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarClose = document.getElementById("sidebarClose");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarElement = document.querySelector(".sidebar");
const sidebarTabBtn = document.getElementById("sidebarTabBtn");

function openSidebar() {
    if (sidebarElement) sidebarElement.classList.add("open");
    if (sidebarOverlay) {
        sidebarOverlay.style.display = "block";
        setTimeout(() => sidebarOverlay.classList.add("show"), 10);
    }
}

function closeSidebar() {
    if (sidebarElement) sidebarElement.classList.remove("open");
    if (sidebarOverlay) {
        sidebarOverlay.classList.remove("show");
        setTimeout(() => sidebarOverlay.style.display = "none", 300);
    }
}

if (sidebarToggle) {
    sidebarToggle.addEventListener("click", openSidebar);
}

if (sidebarClose) {
    sidebarClose.addEventListener("click", closeSidebar);
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
}

if (sidebarTabBtn) {
    sidebarTabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (sidebarElement && sidebarElement.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });
}

// Auto-cerrar sidebar al enviar formulario en móviles
const prospectFormElement = document.getElementById("prospectForm");
if (prospectFormElement) {
    prospectFormElement.addEventListener("submit", () => {
        if (window.innerWidth <= 992) {
            closeSidebar();
        }
    });
}

// Inicializar Auth al cargar consultando la sesión del servidor
checkSession();

// Bloqueo y Desbloqueo de campos de búsqueda
function lockSearchFields() {
    const nichoInput = document.getElementById("nicho");
    const ciudadInput = document.getElementById("ciudad");
    const zonaInput = document.getElementById("zona");
    const cantidadInput = document.getElementById("cantidad");
    const estiloMensajeSelect = document.getElementById("estiloMensaje");
    
    if (nichoInput) nichoInput.disabled = true;
    if (ciudadInput) ciudadInput.disabled = true;
    if (zonaInput) zonaInput.disabled = true;
    if (serviceInput) serviceInput.disabled = true;
    if (cantidadInput) cantidadInput.disabled = true;
    if (estiloMensajeSelect) estiloMensajeSelect.disabled = true;
    
    if (submitBtn) submitBtn.style.display = "none";
    if (modifySearchBtn) modifySearchBtn.style.display = "inline-flex";
}

function unlockSearchFields() {
    const nichoInput = document.getElementById("nicho");
    const ciudadInput = document.getElementById("ciudad");
    const zonaInput = document.getElementById("zona");
    const cantidadInput = document.getElementById("cantidad");
    const estiloMensajeSelect = document.getElementById("estiloMensaje");
    
    if (nichoInput) nichoInput.disabled = false;
    if (ciudadInput) ciudadInput.disabled = false;
    if (zonaInput) zonaInput.disabled = false;
    if (serviceInput) serviceInput.disabled = false;
    if (cantidadInput) cantidadInput.disabled = false;
    if (estiloMensajeSelect) estiloMensajeSelect.disabled = false;
    
    if (submitBtn) submitBtn.style.display = "inline-flex";
    if (modifySearchBtn) modifySearchBtn.style.display = "none";
}

if (modifySearchBtn) {
    modifySearchBtn.addEventListener("click", unlockSearchFields);
}
