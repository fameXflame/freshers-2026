// Freshers Gala '26 Mobile & Desktop Interactive Script

const PAYMENT_URL = "https://rzp.io/rzp/Zz811t3G";

// Initialize Lucide icons & components
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Initialize QR Code inside Modal
  initQRCode();

  // Setup FAQ Accordions
  setupFAQs();

  // Setup Pay Button Confetti
  const payBtn = document.getElementById("pay-btn");
  if (payBtn) {
    payBtn.addEventListener("click", () => {
      triggerConfetti();
    });
  }
});

// Generate Responsive Crisp QR Code for Razorpay Link
function initQRCode() {
  const qrContainer = document.getElementById("qrcode");
  if (!qrContainer) return;

  qrContainer.innerHTML = "";

  const isSmallMobile = window.innerWidth < 380;
  const qrSize = isSmallMobile ? 160 : 188;

  if (typeof QRCode !== "undefined") {
    new QRCode(qrContainer, {
      text: PAYMENT_URL,
      width: qrSize,
      height: qrSize,
      colorDark: "#07090e",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
}

// Mobile Web Share API or Clipboard Fallback
function shareOrCopy() {
  if (navigator.share) {
    navigator.share({
      title: "IIIT Bhopal Freshers '26 Fund Contribution",
      text: "Pay ₹1,000 contribution for IIIT Bhopal Freshers Gala '26 welcoming the juniors:\n" + PAYMENT_URL,
      url: PAYMENT_URL
    }).catch(() => {
      // If user dismissed share sheet, do nothing or fallback
    });
  } else {
    copyPaymentLink();
  }
}

// Copy Payment Link to Clipboard
function copyPaymentLink() {
  navigator.clipboard.writeText(PAYMENT_URL).then(() => {
    showToast("Payment link copied to clipboard!");
    triggerConfetti();
  }).catch(() => {
    const tempInput = document.createElement("input");
    tempInput.value = PAYMENT_URL;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    showToast("Payment link copied to clipboard!");
  });
}

// Toast notification helper
let toastTimeout;
function showToast(message) {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-message");
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

// QR Modal Controls
function openQRModal() {
  const modal = document.getElementById("qr-modal");
  if (modal) {
    modal.classList.add("active");
    // Prevent background scrolling on mobile
    document.body.style.overflow = "hidden";
  }
}

function closeQRModal() {
  const modal = document.getElementById("qr-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// Close modal when clicking backdrop or ESC
window.addEventListener("click", (e) => {
  const modal = document.getElementById("qr-modal");
  if (e.target === modal) {
    closeQRModal();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeQRModal();
  }
});

// Setup FAQ Accordions
function setupFAQs() {
  const toggles = document.querySelectorAll(".faq-toggle");
  toggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      const isOpen = !content.classList.contains("hidden");

      // Close all other FAQs
      document.querySelectorAll(".faq-content").forEach((c) => c.classList.add("hidden"));
      document.querySelectorAll(".faq-toggle").forEach((b) => b.classList.remove("active"));

      // Toggle current
      if (!isOpen) {
        content.classList.remove("hidden");
        btn.classList.add("active");
      }
    });
  });
}

// Multi-cannon celebratory Confetti burst
function triggerConfetti() {
  if (typeof confetti === "function") {
    // Left cannon
    confetti({
      particleCount: 35,
      angle: 60,
      spread: 50,
      origin: { x: 0.1, y: 0.75 },
      colors: ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4"]
    });
    // Right cannon
    confetti({
      particleCount: 35,
      angle: 120,
      spread: 50,
      origin: { x: 0.9, y: 0.75 },
      colors: ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4"]
    });
  }
}
