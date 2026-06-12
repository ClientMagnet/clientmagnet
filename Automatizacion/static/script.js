// Global State
let localLeads = [];

// DOM Elements
const prospectForm = document.getElementById("prospectForm");
const submitBtn = document.getElementById("submitBtn");
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
    const apiKey = document.getElementById("apiKey").value.trim();
    
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
                api_key: apiKey
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === "success") {
            localLeads = result.data;
            
            if (localLeads.length === 0) {
                // Empty results
                showToast("Búsqueda completada, pero no se encontraron leads con teléfono registrado.", "info");
                renderEmptyState();
            } else {
                showToast(`Se cargaron ${localLeads.length} leads exitosamente.`, "success");
                renderLeads(nicho, ciudad, zona);
            }
        } else {
            showToast(result.message || "Error al realizar la búsqueda.", "error");
            renderEmptyState();
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        showToast("Error de conexión con el servidor local.", "error");
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
    
    // Mostrar barra de filtros y desmarcar checkbox
    const filterBar = document.getElementById("filterBar");
    const hidePremiumCheckbox = document.getElementById("hidePremiumLeads");
    filterBar.style.display = "flex";
    hidePremiumCheckbox.checked = false;
    document.getElementById("filterInfo").textContent = `Mostrando todos los ${localLeads.length} leads.`;
    
    searchBreadcrumb.innerHTML = `Resultados para: <strong>${nicho}</strong> en <strong>${zona}, ${ciudad}</strong>`;
    
    leadsTableBody.innerHTML = "";
    
    localLeads.forEach((lead, index) => {
        const tr = document.createElement("tr");
        tr.id = `row-${index}`;
        tr.className = "status-pendiente";
        
        const calidadClass = getCalidadClass(lead.calidad_score);
        
        tr.innerHTML = `
            <td>
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
            <td>
                <div class="phone-raw">${lead.phone_original}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">WSP: +${lead.phone_clean}</div>
            </td>
            <td>
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
            <td>
                <div class="address-text" title="${lead.address}">${lead.address}</div>
            </td>
            <td>
                <div class="proposal-box">
                    <textarea class="proposal-textarea" id="textarea-${index}">${lead.message}</textarea>
                    <div class="proposal-actions">
                        <button class="btn-mini" onclick="copyProposal(${index})" title="Copiar al portapapeles"><i class="fa-solid fa-copy"></i></button>
                    </div>
                </div>
            </td>
            <td style="text-align: center;">
                <a href="${lead.whatsapp_link}" target="_blank" class="btn-send-whatsapp" id="whatsapp-btn-${index}" onclick="markAsContacted(${index})">
                    <i class="fa-brands fa-whatsapp"></i> Enviar
                </a>
            </td>
            <td>
                <select class="status-select" id="select-${index}" onchange="updateStatus(${index}, this.value)">
                    <option value="[Pendiente]" selected>Pendiente</option>
                    <option value="[Contactado]">Contactado</option>
                    <option value="[Sin Respuesta]">Sin Respuesta</option>
                    <option value="[Interesado]">Interesado</option>
                    <option value="[Rechazado]">Rechazado</option>
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

// Filtro interactivo de leads premium
const hidePremiumCheckbox = document.getElementById("hidePremiumLeads");
if (hidePremiumCheckbox) {
    hidePremiumCheckbox.addEventListener("change", function() {
        const hidePremium = this.checked;
        let visibleCount = 0;
        
        localLeads.forEach((lead, index) => {
            const tr = document.getElementById(`row-${index}`);
            if (!tr) return;
            
            const shouldHide = hidePremium && (lead.calidad_score > 70);
            if (shouldHide) {
                tr.style.display = "none";
            } else {
                tr.style.display = "";
                visibleCount++;
            }
        });
        
        const filterInfo = document.getElementById("filterInfo");
        if (hidePremium) {
            const hiddenCount = localLeads.length - visibleCount;
            filterInfo.textContent = `Omitidos ${hiddenCount} prospectos premium. Mostrando ${visibleCount} leads críticos/medios.`;
        } else {
            filterInfo.textContent = `Mostrando todos los ${localLeads.length} leads.`;
        }
        
        updateMetrics();
    });
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
