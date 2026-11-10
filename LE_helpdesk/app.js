const STORAGE_KEY = "northstar-helpdesk-tickets-v1";
const ROLE_STORAGE_KEY = "northstar-helpdesk-role-v1";
const STARTING_TICKET_NUMBER = 2841;

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

const starterTickets = [
  {
    id: "IT-2841",
    category: "Projector / display",
    summary: "Projector flickers during lessons",
    device: "Epson classroom projector",
    location: "Room 204 · Science wing",
    description: "The image flickers after about five minutes.",
    status: "In progress",
    update: "Technician assigned",
    assignedTechnician: "Marcus Lee",
    createdAt: dateDaysAgo(1),
    urgent: false,
  },
  {
    id: "IT-2836",
    category: "Software / account",
    summary: "Can’t access the gradebook",
    device: "Teacher laptop · Gradebook",
    location: "Room 118 · East hall",
    description: "I am getting a sign-in error.",
    status: "Awaiting you",
    update: "IT team left a reply",
    assignedTechnician: "Jenna Ruiz",
    createdAt: dateDaysAgo(2),
    urgent: false,
  },
  {
    id: "IT-2819",
    category: "Network / Wi-Fi",
    summary: "Wi-Fi drops in my classroom",
    device: "Classroom Wi-Fi access point",
    location: "Room 305 · Science wing",
    description: "Connection drops during class.",
    status: "Resolved",
    update: "Resolved yesterday",
    assignedTechnician: "Marcus Lee",
    createdAt: dateDaysAgo(4),
    urgent: false,
  },
];

const categoryIcons = {
  Computer: ["i-monitor", "category-blue"],
  "Projector / display": ["i-projector", "category-purple"],
  "Network / Wi-Fi": ["i-wifi", "category-green"],
  "Software / account": ["i-code", "category-amber"],
  Other: ["i-ellipsis", "category-gray"],
};

const ticketList = document.querySelector("#ticket-list");
const emptyState = document.querySelector("#empty-state");
const form = document.querySelector("#issue-form");
const toast = document.querySelector("#toast");
const searchInput = document.querySelector("#request-search");
const ticketDialog = document.querySelector("#ticket-dialog");
const roleDialog = document.querySelector("#role-dialog");
const demoRoleSelect = document.querySelector("#demo-role");
let activeFilter = "all";
let activeRole = readStoredRole();
let toastTimeout;

function readStoredRole() {
  try {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY);
    return stored === "technician" || stored === "client" ? stored : "client";
  } catch {
    return "client";
  }
}

function readTickets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(starterTickets));
      return [...starterTickets];
    }
    const tickets = JSON.parse(stored);
    if (!Array.isArray(tickets)) throw new Error("Saved requests are not a list.");
    return tickets.filter((ticket) => ticket && typeof ticket === "object");
  } catch {
    showToast("Your saved requests could not be loaded. Please check your browser storage.", true);
    return [...starterTickets];
  }
}

let tickets = readTickets();
const today = new Date();
document.querySelector("#current-date").textContent = today
  .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  .toUpperCase();
const schoolYearStart = today.getFullYear() - (today.getMonth() < 7 ? 1 : 0);
document.querySelector("#school-year").textContent = `${schoolYearStart}–${String(schoolYearStart + 1).slice(-2)} school year`;

function saveTickets() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    return true;
  } catch {
    showToast("Your request could not be saved in this browser. Check storage settings and try again.", true);
    return false;
  }
}

function icon(name) {
  return `<svg aria-hidden="true"><use href="#${name}"></use></svg>`;
}

function statusClass(status) {
  if (status === "Resolved") return "status-resolved";
  if (status === "Awaiting you") return "status-waiting";
  if (status === "Open") return "status-open";
  return "status-progress";
}

function ticketRoom(ticket) {
  return ticket.location.split(" · ")[0];
}

function ticketDevice(ticket) {
  return ticket.device || ({
    Computer: "Classroom computer",
    "Projector / display": "Classroom projector",
    "Network / Wi-Fi": "Classroom Wi-Fi",
    "Software / account": "Teacher software / account",
    Other: "Classroom technology",
  })[ticket.category] || "Classroom technology";
}

function ticketTechnician(ticket) {
  if (ticket.assignedTechnician) return ticket.assignedTechnician;
  return ticket.update === "Technician assigned" ? "IT technician" : "Not assigned";
}

function ticketCreatedDate(ticket) {
  const parsedDate = ticket.createdAt ? new Date(ticket.createdAt) : new Date(`${ticket.date || ""}, ${today.getFullYear()}`);
  if (Number.isNaN(parsedDate.getTime())) return ticket.date || "Date unavailable";
  return parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function matchesFilter(ticket) {
  if (activeFilter === "open") return ticket.status !== "Resolved";
  if (activeFilter === "resolved") return ticket.status === "Resolved";
  return true;
}

function renderTickets() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleTickets = tickets.filter((ticket) => {
    const searchable = `${ticket.id} ${ticket.category} ${ticket.summary} ${ticket.location} ${ticket.device || ""} ${ticket.status} ${ticketTechnician(ticket)}`.toLowerCase();
    return matchesFilter(ticket) && searchable.includes(query);
  });

  ticketList.innerHTML = visibleTickets.map((ticket) => {
    const [iconName, iconClass] = categoryIcons[ticket.category] ?? categoryIcons.Other;
    return `
      <article class="ticket-card">
        <span class="ticket-category-icon ${iconClass}">${icon(iconName)}</span>
        <div class="ticket-main">
          <div class="ticket-title-row">
            <h3 class="ticket-title" title="${escapeHtml(ticket.summary)}">${escapeHtml(ticket.summary)}</h3>
            <button type="button" class="ticket-open-button" data-ticket-id="${escapeHtml(ticket.id)}" aria-label="Open ticket ${escapeHtml(ticket.id)}">Open ${icon("i-arrow")}</button>
          </div>
          <div class="ticket-dashboard-fields">
            <div class="ticket-dashboard-field"><span class="ticket-field-label">TICKET ID</span><strong>${escapeHtml(ticket.id)}</strong><span>${escapeHtml(ticketRoom(ticket))}</span></div>
            <div class="ticket-dashboard-field"><span class="ticket-field-label">DEVICE</span><strong>${escapeHtml(ticketDevice(ticket))}</strong><span>${escapeHtml(ticket.category)}</span></div>
            <div class="ticket-dashboard-field"><span class="ticket-field-label">ASSIGNED TECHNICIAN</span><strong>${escapeHtml(ticketTechnician(ticket))}</strong><span class="ticket-created-mobile">Created ${escapeHtml(ticketCreatedDate(ticket))}</span></div>
            <div class="ticket-dashboard-field ticket-created-field"><span class="ticket-field-label">CREATED</span><strong>${escapeHtml(ticketCreatedDate(ticket))}</strong>${ticket.urgent ? '<span class="ticket-urgent">PRIORITY</span>' : ""}</div>
          </div>
          <div class="ticket-status-row">
            <span class="ticket-status ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span>
            <span class="ticket-update">${escapeHtml(ticket.update)}</span>
          </div>
        </div>
      </article>`;
  }).join("");

  emptyState.hidden = visibleTickets.length > 0;
  ticketList.hidden = visibleTickets.length === 0;
  document.querySelector("#request-count").textContent = tickets.length;
  document.querySelector("#nav-count").textContent = tickets.filter((ticket) => ticket.status !== "Resolved").length;
  document.querySelector("#open-total").textContent = tickets.filter((ticket) => ticket.status === "Open" || ticket.status === "In progress").length;
  document.querySelector("#waiting-total").textContent = tickets.filter((ticket) => ticket.status === "Awaiting you").length;
  document.querySelector("#browser-request-total").textContent = String(tickets.length).padStart(2, "0");
  const resolvedCount = tickets.filter((ticket) => ticket.status === "Resolved").length;
  document.querySelector("#resolved-total").textContent = 12 + resolvedCount - starterTickets.filter((ticket) => ticket.status === "Resolved").length;
}

function saveStoredRole() {
  try {
    localStorage.setItem(ROLE_STORAGE_KEY, activeRole);
  } catch {
    // Ignore storage failures; the UI can still operate in the current session.
  }
}

function renderDemoRole() {
  const isTechnician = activeRole === "technician";
  document.querySelector("#report-issue").hidden = isTechnician;
  document.querySelector(".workspace-grid").classList.toggle("technician-view", isTechnician);
  document.querySelector("#welcome-name").textContent = isTechnician ? "Marcus" : "Olivia";
  document.querySelector("#welcome-subtitle").textContent = isTechnician
    ? "Review the helpdesk queue and open a request for details."
    : "Let’s get your classroom tech back on track.";
  document.querySelector("#hero-copy").textContent = isTechnician
    ? "Review classroom IT reports and see the details of each request."
    : "Explore a classroom IT report and see how requests are organized.";
  document.querySelector("#hero-action").hidden = isTechnician;
  document.querySelector("#profile-name").textContent = isTechnician ? "Marcus Lee" : "Olivia Carter";
  document.querySelector("#profile-role").textContent = isTechnician ? "IT technician" : "Science teacher";
  document.querySelector(".avatar").textContent = isTechnician ? "ML" : "OC";
  document.querySelector("#top-avatar").textContent = isTechnician ? "ML" : "OC";
  document.querySelector("#requests-title").textContent = isTechnician ? "Request queue" : "Your requests";
  document.querySelector("#nav-requests-label").textContent = isTechnician ? "Request queue" : "My requests";
  demoRoleSelect.value = activeRole;
  saveStoredRole();
  renderTickets();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 4500);
}

document.querySelectorAll(".category-option input").forEach((input) => {
  input.addEventListener("change", () => {
    document.querySelectorAll(".category-option").forEach((option) => option.classList.remove("selected"));
    input.closest(".category-option").classList.add("selected");
  });
});

document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeFilter = tab.dataset.filter;
    document.querySelectorAll(".filter-tab").forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    renderTickets();
  });
});

ticketList.addEventListener("click", (event) => {
  const openButton = event.target.closest(".ticket-open-button");
  if (!openButton) return;
  const ticket = tickets.find((item) => item.id === openButton.dataset.ticketId);
  if (ticket) openTicket(ticket);
});

function openTicket(ticket) {
  const [iconName, iconClass] = categoryIcons[ticket.category] ?? categoryIcons.Other;
  const dialogIcon = document.querySelector(".dialog-category-icon");
  dialogIcon.className = `ticket-category-icon dialog-category-icon ${iconClass}`;
  dialogIcon.innerHTML = icon(iconName);
  document.querySelector("#dialog-summary").textContent = ticket.summary;
  document.querySelector("#dialog-ticket-id").textContent = ticket.id;
  document.querySelector("#dialog-category").textContent = ticket.category;
  document.querySelector("#dialog-device").textContent = ticketDevice(ticket);
  document.querySelector("#dialog-room").textContent = ticketRoom(ticket);
  document.querySelector("#dialog-technician").textContent = ticketTechnician(ticket);
  const requesterContainer = document.querySelector("#dialog-requester-container");
  requesterContainer.hidden = activeRole !== "technician";
  document.querySelector("#dialog-requester").textContent = ticket.requester || "Olivia Carter";
  document.querySelector("#dialog-created").textContent = ticketCreatedDate(ticket);
  document.querySelector("#dialog-priority").textContent = ticket.urgent ? "Class in session" : "Standard";
  document.querySelector("#dialog-description").textContent = ticket.description || "No additional details provided.";
  document.querySelector("#dialog-update").textContent = ticket.update;
  const dialogStatus = document.querySelector("#dialog-status");
  dialogStatus.className = `ticket-status dialog-ticket-status ${statusClass(ticket.status)}`;
  dialogStatus.textContent = ticket.status;
  if (!ticketDialog.open) ticketDialog.showModal();
}

ticketDialog.querySelectorAll(".dialog-close-icon, .dialog-close-button").forEach((button) => {
  button.addEventListener("click", () => ticketDialog.close());
});

ticketDialog.addEventListener("click", (event) => {
  if (event.target === ticketDialog) ticketDialog.close();
});

roleDialog.querySelectorAll("[data-role]").forEach((button) => {
  button.addEventListener("click", () => {
    activeRole = button.dataset.role;
    demoRoleSelect.value = activeRole;
    renderDemoRole();
    roleDialog.close();
  });
});

roleDialog.addEventListener("cancel", (event) => event.preventDefault());
try {
  if (!localStorage.getItem(ROLE_STORAGE_KEY)) {
    roleDialog.showModal();
  }
} catch {
  roleDialog.showModal();
}

searchInput.addEventListener("input", renderTickets);

demoRoleSelect.addEventListener("change", () => {
  activeRole = demoRoleSelect.value;
  renderDemoRole();
});

function nextTicketId() {
  const latestTicketNumber = tickets.reduce((max, ticket) => {
    const ticketNumber = Number(String(ticket.id).replace(/\D/g, ""));
    if (Number.isFinite(ticketNumber)) {
      return Math.max(max, ticketNumber);
    }
    return max;
  }, STARTING_TICKET_NUMBER);

  return `IT-${latestTicketNumber + 1}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const now = new Date();
  const ticket = {
    id: nextTicketId(),
    category: data.get("category"),
    summary: data.get("summary").trim(),
    device: data.get("device").trim(),
    location: data.get("location").trim(),
    description: data.get("description").trim(),
    status: "Open",
    update: "Request submitted",
    requester: "Olivia Carter",
    assignedTechnician: "Not assigned",
    createdAt: now.toISOString(),
    urgent: data.get("urgent") === "on",
  };

  tickets.unshift(ticket);
  if (!saveTickets()) {
    tickets.shift();
    return;
  }

  form.reset();
  document.querySelectorAll(".category-option").forEach((option) => option.classList.remove("selected"));
  document.querySelector('.category-option input[value="Computer"]').closest(".category-option").classList.add("selected");
  activeFilter = "all";
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    const selected = tab.dataset.filter === "all";
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  searchInput.value = "";
  renderTickets();
  showToast(`${ticket.id} saved in this browser. It has not been sent to IT.`);
  document.querySelector("#my-requests").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

renderDemoRole();
