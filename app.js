// ==========================================================================
// IIIT Bhopal Freshers '26 — Payment + Google Sheets Integration
// Flow: Fill form → Validate → Reveal Razorpay button → Pay → Log to Sheet
// ==========================================================================

// ─── Configuration ──────────────────────────────
const PAYMENT_URL = "https://rzp.io/rzp/Zz811t3G"; // QR / share fallback
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwdR9zDGX89AXfqXo7oLxIBeMPWce_P4wL08boloCbqeuml9yZYtIFuojjhnWVD_Amx/exec";

// ─── State ──────────────────────────────────────
let paymentCompleted = false;

// ─── Initialization ─────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== "undefined" && lucide.createIcons) {
    lucide.createIcons();
  }
  initQRCode();
  setupFAQs();
  setupPaymentFlow();
  listenForPaymentSuccess();
  checkUrlPaymentParams();
});

// Check if user was redirected back to the site after successful payment
function checkUrlPaymentParams() {
  const params = new URLSearchParams(window.location.search);
  const paymentId = params.get("razorpay_payment_id") || params.get("payment_id");
  if (paymentId || params.get("status") === "success" || params.get("payment") === "success") {
    paymentCompleted = true;
    handlePaymentSuccess(paymentId || "verified-via-redirect");
  }
}

// ==========================================================================
// QR Code
// ==========================================================================
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

// ==========================================================================
// Form Validation
// ==========================================================================
function getFormData() {
  return {
    name: (document.getElementById("student-name")?.value || "").trim(),
    phone: (document.getElementById("student-phone")?.value || "").trim(),
    scholarNumber: (document.getElementById("student-scholar")?.value || "").trim(),
  };
}

function validateForm() {
  const data = getFormData();
  let valid = true;

  // Reset all errors
  document.querySelectorAll(".form-input").forEach((el) => el.classList.remove("error"));
  document.querySelectorAll(".field-error").forEach((el) => el.classList.add("hidden"));

  if (!data.name || data.name.length < 2) {
    showFieldError("student-name", "name-error");
    valid = false;
  }

  if (!data.phone || !/^\d{10}$/.test(data.phone)) {
    showFieldError("student-phone", "phone-error");
    valid = false;
  }

  if (!data.scholarNumber || data.scholarNumber.length < 2) {
    showFieldError("student-scholar", "scholar-error");
    valid = false;
  }

  return valid;
}

function showFieldError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.add("error");
  if (error) error.classList.remove("hidden");
}

// Clear errors on input
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("form-input")) {
    e.target.classList.remove("error");
    const errorEl = e.target.parentElement?.querySelector(".field-error");
    if (errorEl) errorEl.classList.add("hidden");
  }
});

// ==========================================================================
// Payment Flow — Validate → Reveal Razorpay → User clicks Razorpay directly
// ==========================================================================
function setupPaymentFlow() {
  const customBtn = document.getElementById("custom-pay-btn");
  const mobileBtn = document.getElementById("mobile-pay-trigger");

  if (customBtn) {
    customBtn.addEventListener("click", handlePayClick);
  }

  if (mobileBtn) {
    mobileBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Scroll to form so user sees fields + validation
      const formSection = document.getElementById("student-form-section");
      if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setTimeout(() => handlePayClick(), 400);
    });
  }
}

function handlePayClick() {
  if (paymentCompleted) return;

  if (!validateForm()) {
    showToast("Please fill in all details first", "Required fields are missing");
    const firstError = document.querySelector(".form-input.error");
    if (firstError) firstError.focus();
    return;
  }

  // Store form data in sessionStorage (persists across Razorpay modal)
  const formData = getFormData();
  sessionStorage.setItem("freshers_payment_data", JSON.stringify(formData));

  // Hide our button, reveal the real Razorpay button
  const customBtn = document.getElementById("custom-pay-btn");
  const rzpStep = document.getElementById("rzp-step");

  if (customBtn) customBtn.classList.add("hidden");
  if (rzpStep) {
    rzpStep.classList.remove("hidden");
    // Re-render lucide icons for the check icon in the confirmation bar
    if (typeof lucide !== "undefined") lucide.createIcons();
    // Scroll to make the Razorpay button visible
    rzpStep.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  showToast("Details saved ✓", "Now tap the Razorpay button to pay");
}

// ==========================================================================
// Payment Success Detection via postMessage
// ==========================================================================
function listenForPaymentSuccess() {
  window.addEventListener("message", (event) => {
    if (!event.data || paymentCompleted) return;

    let data = event.data;

    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { return; }
    }

    // Razorpay payment success patterns (including button iframe messages)
    const isSuccess =
      (data.event === "payment.success") ||
      (data.event_type === "redirect_to_on_payment_success") ||
      (data.razorpay_payment_id) ||
      (data.payload && data.payload.payment && data.payload.payment.entity) ||
      (data["payment.success"]);

    if (isSuccess) {
      paymentCompleted = true;

      const paymentId =
        data.razorpay_payment_id ||
        (data.data && data.data.payment_id) ||
        (data.payload?.payment?.entity?.id) ||
        (data.response?.razorpay_payment_id) ||
        "verified";

      handlePaymentSuccess(paymentId);
    }
  });

  // Backup: watch for DOM changes in the Razorpay form (success text injected)
  const rzpForm = document.getElementById("rzp-form");
  if (rzpForm) {
    const observer = new MutationObserver((mutations) => {
      if (paymentCompleted) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const text = (node.textContent || "").toLowerCase();
            if (text.includes("success") || text.includes("paid") || text.includes("completed")) {
              paymentCompleted = true;
              handlePaymentSuccess("verified-via-dom");
            }
          }
        }
      }
    });
    observer.observe(rzpForm, { childList: true, subtree: true });
  }
}

// ==========================================================================
// Handle Successful Payment — Log to Google Sheets
// ==========================================================================
function handlePaymentSuccess(paymentId) {
  let formData;
  try {
    formData = JSON.parse(sessionStorage.getItem("freshers_payment_data") || "{}");
  } catch {
    formData = getFormData();
  }

  showSuccessUI(paymentId);

  logToGoogleSheets({
    name: formData.name || "",
    phone: formData.phone || "",
    scholarNumber: formData.scholarNumber || "",
    paymentId: paymentId,
    amount: "1000",
  });

  showToast("Payment successful!", "Your details have been recorded ✓");
  sessionStorage.removeItem("freshers_payment_data");
}

function showSuccessUI(paymentId) {
  const formSection = document.getElementById("student-form-section");
  const customBtn = document.getElementById("custom-pay-btn");
  const rzpStep = document.getElementById("rzp-step");
  const successDiv = document.getElementById("payment-success");
  const paymentIdDisplay = document.getElementById("payment-id-display");

  if (formSection) formSection.style.display = "none";
  if (customBtn) customBtn.style.display = "none";
  if (rzpStep) rzpStep.style.display = "none";
  if (successDiv) {
    successDiv.classList.remove("hidden");
    if (typeof lucide !== "undefined") lucide.createIcons();
  }
  if (paymentIdDisplay && paymentId) {
    paymentIdDisplay.textContent = "Payment ID: " + paymentId;
  }
}

function logToGoogleSheets(data) {
  if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL === "YOUR_APPS_SCRIPT_URL_HERE") {
    console.warn("Google Sheet URL not configured. Payment data:", data);
    return;
  }

  fetch(GOOGLE_SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data),
  }).catch((err) => {
    console.error("Sheet logging failed:", err);
  });
}

// ==========================================================================
// Share / Copy
// ==========================================================================
function shareOrCopy() {
  if (navigator.share) {
    navigator.share({
      title: "IIIT Bhopal Freshers '26 Contribution",
      text: "Contribute ₹1,000 for IIIT Bhopal Freshers 2026:",
      url: PAYMENT_URL,
    }).catch(() => {});
  } else {
    copyToClipboard();
  }
}

function copyToClipboard() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(PAYMENT_URL).then(() => {
      showToast("Payment link copied!", "Share with batchmates");
    }).catch(() => fallbackCopy());
  } else {
    fallbackCopy();
  }
}

function fallbackCopy() {
  const ta = document.createElement("textarea");
  ta.value = PAYMENT_URL;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    showToast("Payment link copied!", "Share with batchmates");
  } catch {
    showToast("Link: " + PAYMENT_URL, "");
  }
  document.body.removeChild(ta);
}

// ==========================================================================
// Toast
// ==========================================================================
let toastTimer;
function showToast(message, subtitle) {
  const toast = document.getElementById("toast");
  const msgEl = document.getElementById("toast-message");
  const subEl = document.getElementById("toast-sub");
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  if (subEl) subEl.textContent = subtitle || "";

  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

// ==========================================================================
// QR Modal
// ==========================================================================
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
  if (e.target.id === "qr-modal") closeQRModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeQRModal();
});

// ==========================================================================
// FAQ Accordion
// ==========================================================================
function setupFAQs() {
  const buttons = document.querySelectorAll(".faq-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.nextElementSibling;
      const isExpanded = btn.getAttribute("aria-expanded") === "true";

      buttons.forEach((otherBtn) => {
        if (otherBtn !== btn) {
          otherBtn.setAttribute("aria-expanded", "false");
          otherBtn.nextElementSibling?.classList.remove("open");
        }
      });

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
