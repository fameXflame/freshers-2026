// IIIT Bhopal Freshers '26 — Editorial Luxury Script
// Reliable, fast, accessible interactions

const PAYMENT_URL = "https://rzp.io/rzp/Zz811t3G";

document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== "undefined" && lucide.createIcons) {
    lucide.createIcons();
  }
  initQRCode();
  setupFAQs();
});

// ─── Generate Clean UPI QR Code ─────────────────
function initQRCode() {
  const el = document.getElementById("qrcode");
  if (!el || typeof QRCode === "undefined") return;
  el.innerHTML = "";
  new QRCode(el, {
    text: PAYMENT_URL,
    width: 176,
    height: 176,
    colorDark: "#4c0519",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

// ─── Native Web Share with Clipboard Fallback ───
function shareOrCopy() {
  if (navigator.share) {
    navigator.share({
      title: "IIIT Bhopal Freshers '26 Contribution",
      text: "Support IIIT Bhopal Freshers 2026! 2nd-year batch contribution portal (₹1,000):",
      url: PAYMENT_URL,
    }).catch(() => {
      // User dismissed or share failed, silent fallback
    });
  } else {
    copyToClipboard();
  }
}

// ─── Robust Clipboard Copy ──────────────────────
function copyToClipboard() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(PAYMENT_URL).then(() => {
      showToast("Payment link copied to clipboard!");
    }).catch(() => {
      fallbackCopy();
    });
  } else {
    fallbackCopy();
  }
}

function fallbackCopy() {
  const textarea = document.createElement("textarea");
  textarea.value = PAYMENT_URL;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand("copy");
    showToast("Payment link copied to clipboard!");
  } catch (err) {
    showToast("Link: " + PAYMENT_URL);
  }
  document.body.removeChild(textarea);
}

// ─── Toast System ───────────────────────────────
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  const msgEl = document.getElementById("toast-message");
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

// ─── Modal Control ──────────────────────────────
function openQRModal() {
  const modal = document.getElementById("qr-modal");
  if (!modal) return;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeQRModal() {
  const modal = document.getElementById("qr-modal");
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

window.addEventListener("click", (e) => {
  if (e.target.id === "qr-modal") {
    closeQRModal();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeQRModal();
  }
});

// ─── FAQ Accordion ──────────────────────────────
function setupFAQs() {
  const buttons = document.querySelectorAll(".faq-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.nextElementSibling;
      const isExpanded = btn.getAttribute("aria-expanded") === "true";

      // Close all other panels
      buttons.forEach((otherBtn) => {
        if (otherBtn !== btn) {
          otherBtn.setAttribute("aria-expanded", "false");
          if (otherBtn.nextElementSibling) {
            otherBtn.nextElementSibling.classList.remove("open");
          }
        }
      });

      // Toggle current panel
      if (isExpanded) {
        btn.setAttribute("aria-expanded", "false");
        panel?.classList.remove("open");
      } else {
        btn.setAttribute("aria-expanded", "true");
        panel?.classList.add("open");
      }
    });
  });
}
