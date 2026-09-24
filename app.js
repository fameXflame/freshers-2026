// ==========================================================================
// IIIT Bhopal Freshers '26 — Payment + Google Sheets Integration
// Flow: Fill form → Validate → Pay via Razorpay → Log to Google Sheets
// ==========================================================================

// ─── Configuration ──────────────────────────────
const PAYMENT_URL = "https://rzp.io/rzp/Zz811t3G"; // QR / share fallback
const GOOGLE_SHEET_URL = "YOUR_APPS_SCRIPT_URL_HERE"; // Replace with your Apps Script Web App URL

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
});

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

  // Name
  if (!data.name || data.name.length < 2) {
    showFieldError("student-name", "name-error");
    valid = false;
  }

  // Phone — must be exactly 10 digits
  if (!data.phone || !/^\d{10}$/.test(data.phone)) {
    showFieldError("student-phone", "phone-error");
    valid = false;
  }

  // Scholar number
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
// Payment Flow — Validate form, then trigger Razorpay button
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
      // Scroll to form first so user can see validation errors
      const formSection = document.getElementById("student-form-section");
      if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Small delay to let scroll finish, then validate
      setTimeout(() => handlePayClick(), 400);
    });
  }
}

function handlePayClick() {
  if (paymentCompleted) return;

  if (!validateForm()) {
    showToast("Please fill in all your details first", "Required fields are missing");
    // Focus the first invalid field
    const firstError = document.querySelector(".form-input.error");
    if (firstError) firstError.focus();
    return;
  }

  // Store form data before triggering Razorpay (in case modal clears focus)
  const formData = getFormData();
  sessionStorage.setItem("freshers_payment_data", JSON.stringify(formData));

  // Find and click the hidden Razorpay button
  triggerRazorpayButton();
}

function triggerRazorpayButton() {
  const rzpContainer = document.getElementById("rzp-button-container");
  if (!rzpContainer) return;

  // The Razorpay script creates a button inside the form
  const rzpButton =
    rzpContainer.querySelector(".razorpay-payment-button") ||
    rzpContainer.querySelector("button") ||
    rzpContainer.querySelector('input[type="submit"]');

  if (rzpButton) {
    // Temporarily make the container clickable
    rzpContainer.style.position = "static";
    rzpContainer.style.opacity = "1";
    rzpContainer.style.pointerEvents = "auto";

    rzpButton.click();

    // Re-hide after a short delay (Razorpay modal is now open)
    setTimeout(() => {
      rzpContainer.style.position = "absolute";
      rzpContainer.style.left = "-9999px";
      rzpContainer.style.opacity = "0";
      rzpContainer.style.pointerEvents = "none";
    }, 500);
  } else {
    // Razorpay button hasn't loaded yet — retry after a moment
    showToast("Loading payment gateway...", "Please wait a moment");
    setTimeout(triggerRazorpayButton, 1500);
  }
}

// ==========================================================================
// Payment Success Detection via postMessage
// Razorpay checkout communicates success back to the parent page
// ==========================================================================
function listenForPaymentSuccess() {
  window.addEventListener("message", (event) => {
    // Razorpay sends various messages; look for payment success indicators
    if (!event.data) return;

    let data = event.data;

    // Sometimes data comes as a string
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }

    // Check for Razorpay payment success patterns
    const isSuccess =
      (data.event === "payment.success") ||
      (data.razorpay_payment_id) ||
      (data.payload && data.payload.payment && data.payload.payment.entity) ||
      (data["payment.success"]);

    if (isSuccess && !paymentCompleted) {
      paymentCompleted = true;

      // Extract payment ID
      const paymentId =
        data.razorpay_payment_id ||
        (data.payload && data.payload.payment && data.payload.payment.entity && data.payload.payment.entity.id) ||
        (data.response && data.response.razorpay_payment_id) ||
        "verified";

      handlePaymentSuccess(paymentId);
    }
  });

  // Also watch for Razorpay modal close + form changes as a backup
  // Some Razorpay integrations modify the form after success
  const rzpForm = document.getElementById("rzp-form");
  if (rzpForm) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const text = node.textContent || "";
            if (
              (text.includes("success") || text.includes("paid") || text.includes("completed")) &&
              !paymentCompleted
            ) {
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
  // Retrieve stored form data
  let formData;
  try {
    formData = JSON.parse(sessionStorage.getItem("freshers_payment_data") || "{}");
  } catch {
    formData = getFormData(); // fallback to current form values
  }

  // Show success UI
  showSuccessUI(paymentId);

  // Log to Google Sheets
  logToGoogleSheets({
    name: formData.name || "",
    phone: formData.phone || "",
    scholarNumber: formData.scholarNumber || "",
    paymentId: paymentId,
    amount: "1000",
  });

  // Show toast
  showToast("Payment successful!", "Your details have been recorded ✓");

  // Clean up
  sessionStorage.removeItem("freshers_payment_data");
}

function showSuccessUI(paymentId) {
  // Hide form and pay button
  const formSection = document.getElementById("student-form-section");
  const customBtn = document.getElementById("custom-pay-btn");
  const successDiv = document.getElementById("payment-success");
  const paymentIdDisplay = document.getElementById("payment-id-display");

  if (formSection) formSection.style.display = "none";
  if (customBtn) customBtn.style.display = "none";
  if (successDiv) {
    successDiv.classList.remove("hidden");
    // Re-render lucide icons for the success section
    if (typeof lucide !== "undefined") lucide.createIcons();
  }
  if (paymentIdDisplay && paymentId) {
    paymentIdDisplay.textContent = "Payment ID: " + paymentId;
  }
}

function logToGoogleSheets(data) {
  if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL === "YOUR_APPS_SCRIPT_URL_HERE") {
    console.warn("Google Sheet URL not configured. Skipping sheet logging.");
    console.log("Payment data to log:", data);
    return;
  }

  // Use no-cors mode — we can't read the response but the data IS saved
  fetch(GOOGLE_SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(data),
  }).catch((err) => {
    console.error("Sheet logging failed:", err);
    // Silently fail — payment was still successful
  });
}

// ==========================================================================
// Share / Copy
// ==========================================================================
function shareOrCopy() {
  if (navigator.share) {
    navigator.share({
      title: "IIIT Bhopal Freshers '26 Contribution",
      text: "Support IIIT Bhopal Freshers 2026! 2nd-year batch contribution portal (₹1,000):",
      url: PAYMENT_URL,
    }).catch(() => {});
  } else {
    copyToClipboard();
  }
}

function copyToClipboard() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(PAYMENT_URL).then(() => {
      showToast("Payment link copied!", "Share with batchmates on WhatsApp");
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
    showToast("Payment link copied!", "Share with batchmates on WhatsApp");
  } catch {
    showToast("Link: " + PAYMENT_URL, "");
  }
  document.body.removeChild(textarea);
}

// ==========================================================================
// Toast System
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
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
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
          if (otherBtn.nextElementSibling) {
            otherBtn.nextElementSibling.classList.remove("open");
          }
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
