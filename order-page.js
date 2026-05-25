(function () {
  const form = document.getElementById("order-form");
  if (!form) return;

  const paymentEnabled = form.dataset.paymentEnabled === "1";
  const advancePercent = parseInt(form.dataset.advancePercent || "50", 10) || 50;

  const errEl = document.getElementById("order-form-error");
  const payBtn = document.getElementById("order-pay-btn");
  const paymentPanel = document.getElementById("order-payment-panel");
  const panelAmount = document.getElementById("order-panel-amount");
  const publicIdEl = document.getElementById("order-public-id");
  const backBtn = document.getElementById("order-payment-back");
  const razorpayBtn = document.getElementById("order-method-razorpay");
  const whatsappLink = document.getElementById("order-method-whatsapp");

  const totalInput = document.getElementById("order-total");
  const serviceInput = document.getElementById("order-service");
  const planInput = document.getElementById("order-plan");
  const phoneInput = document.getElementById("order-phone");

  const summaryService = document.getElementById("summary-service");
  const summaryPlan = document.getElementById("summary-plan");
  const summaryTotal = document.getElementById("summary-total");
  const summaryAdvance = document.getElementById("summary-advance");

  let checkoutData = null;
  let lastPublicId = "";

  function formatInr(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }

  function computeAdvance(total) {
    const t = Math.max(0, Math.floor(Number(total) || 0));
    if (t <= 0) return 0;
    return Math.max(1, Math.round((t * advancePercent) / 100));
  }

  function updateSummary() {
    const service = serviceInput?.value?.trim() || "—";
    const plan = planInput?.value?.trim() || "—";
    const total = Math.floor(Number(totalInput?.value) || 0);
    const advance = computeAdvance(total);

    if (summaryService) summaryService.textContent = service;
    if (summaryPlan) summaryPlan.textContent = plan;
    if (summaryTotal) {
      summaryTotal.innerHTML =
        total > 0 ? formatInr(total) : '<a href="/pricing">View pricing</a>';
    }
    if (summaryAdvance) summaryAdvance.textContent = advance > 0 ? formatInr(advance) : "—";
    if (panelAmount && advance > 0) panelAmount.textContent = formatInr(advance);
  }

  function showError(msg) {
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.hidden = !msg;
  }

  function getPayload() {
    const fd = new FormData(form);
    return {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      service: String(fd.get("service") || "").trim(),
      plan: String(fd.get("plan") || "").trim(),
      notes: String(fd.get("notes") || "").trim(),
      total_inr: fd.get("total_inr"),
    };
  }

  function validate(payload) {
    if (!payload.name || !payload.email) {
      return "Please enter your full name and email.";
    }
    if (!payload.phone || payload.phone.replace(/\D/g, "").length < 10) {
      return "Please enter a valid 10-digit WhatsApp number.";
    }
    if (!payload.service || !payload.plan) {
      return "Please fill service and package.";
    }
    const total = Math.floor(Number(payload.total_inr) || 0);
    if (total < 1) {
      return "Enter package total (₹) from the pricing page.";
    }
    return "";
  }

  function whatsappUrl(payload, publicId, advance) {
    const text =
      "Hi #TechWithAman, I want to pay advance for:\n" +
      "• Service: " +
      payload.service +
      "\n• Package: " +
      payload.plan +
      "\n• Package total: ₹" +
      Number(payload.total_inr).toLocaleString("en-IN") +
      "\n• Advance (" +
      advancePercent +
      "%): ₹" +
      advance.toLocaleString("en-IN") +
      "\n• Name: " +
      payload.name +
      "\n• Email: " +
      payload.email +
      "\n• Phone: " +
      payload.phone +
      (publicId ? "\n• Order ref: " + publicId : "") +
      (payload.notes ? "\n• Notes: " + payload.notes : "");
    return (
      "https://web.whatsapp.com/send?phone=919528252099&text=" + encodeURIComponent(text)
    );
  }

  function showPaymentPanel(publicId, advanceInr) {
    lastPublicId = publicId || "";
    checkoutData = null;
    if (publicIdEl) publicIdEl.textContent = lastPublicId || "—";
    if (panelAmount) panelAmount.textContent = formatInr(advanceInr);
    if (paymentPanel) {
      paymentPanel.hidden = false;
      paymentPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (payBtn) payBtn.hidden = true;
  }

  function hidePaymentPanel() {
    if (paymentPanel) paymentPanel.hidden = true;
    if (payBtn) payBtn.hidden = false;
    checkoutData = null;
  }

  function loadRazorpayScript() {
    return new Promise(function (resolve, reject) {
      if (window.Razorpay) return resolve();
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error("Could not load payment checkout. Check your internet."));
      };
      document.head.appendChild(s);
    });
  }

  function openCheckout(data) {
    const options = {
      key: data.keyId,
      amount: data.amountPaise,
      currency: "INR",
      name: "#TechWithAman",
      description: data.description,
      order_id: data.razorpayOrderId,
      prefill: data.customer,
      theme: { color: "#2f6efb" },
      handler: function (response) {
        fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        })
          .then(function (r) {
            return r.json().then(function (body) {
              return { ok: r.ok, body: body };
            });
          })
          .then(function (res) {
            if (!res.ok || !res.body.ok) {
              throw new Error(res.body.error || "Verification failed.");
            }
            window.location.href = res.body.redirectUrl;
          })
          .catch(function (e) {
            showError(e.message || "Payment verification failed. Contact us on WhatsApp.");
            if (razorpayBtn) razorpayBtn.disabled = false;
          });
      },
      modal: {
        ondismiss: function () {
          if (razorpayBtn) razorpayBtn.disabled = false;
        },
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (resp) {
      showError(
        (resp.error && resp.error.description) || "Payment failed. Try again or use WhatsApp.",
      );
      if (razorpayBtn) razorpayBtn.disabled = false;
    });
    rzp.open();
  }

  function createOrder(payload) {
    return fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (r) {
      return r.json().then(function (body) {
        return { ok: r.ok, status: r.status, body: body };
      });
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showError("");

    const payload = getPayload();
    const validationError = validate(payload);
    if (validationError) {
      showError(validationError);
      return;
    }

    const advance = computeAdvance(payload.total_inr);
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.textContent = "Please wait…";
    }

    createOrder(payload)
      .then(function (res) {
        const publicId = res.body.publicId || "";
        const advanceInr = res.body.amountInr || advance;

        if (whatsappLink) {
          whatsappLink.href = whatsappUrl(payload, publicId, advanceInr || advance);
        }

        if (res.ok && res.body.ok && paymentEnabled && res.body.razorpayOrderId) {
          checkoutData = res.body;
          showPaymentPanel(publicId, advanceInr || advance);
          return;
        }

        if (res.status === 503 || (res.ok && !res.body.razorpayOrderId)) {
          showPaymentPanel(publicId, advanceInr || advance);
          showError(
            res.body.error ||
              "Online checkout is not configured. Use WhatsApp below to pay advance.",
          );
          return;
        }

        throw new Error(res.body.error || "Could not save order. Try again.");
      })
      .catch(function (err) {
        showError(err.message || "Something went wrong.");
      })
      .finally(function () {
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.textContent = "Continue to payment";
        }
      });
  });

  if (razorpayBtn) {
    razorpayBtn.addEventListener("click", function () {
      showError("");
      if (!checkoutData || !checkoutData.razorpayOrderId) {
        showError("Online payment is not ready. Use WhatsApp or add Razorpay keys in .env.");
        return;
      }
      razorpayBtn.disabled = true;
      loadRazorpayScript()
        .then(function () {
          openCheckout(checkoutData);
        })
        .catch(function (err) {
          showError(err.message);
          razorpayBtn.disabled = false;
        });
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", function () {
      hidePaymentPanel();
      showError("");
      if (payBtn) payBtn.focus();
    });
  }

  ["input", "change"].forEach(function (ev) {
    [totalInput, serviceInput, planInput, phoneInput].forEach(function (el) {
      if (el) el.addEventListener(ev, updateSummary);
    });
  });

  updateSummary();
})();
