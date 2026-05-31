/**
 * =============================================================================
 * CLIENT — receipt-print.js
 * URL: /order/receipt
 * File: receipt-print.js
 * Print receipt button handler
 * =============================================================================
 */

(function () {
  const btn = document.getElementById("receipt-print-btn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    const receipt = document.getElementById("payment-receipt");
    const orderId = receipt?.querySelector(".payment-receipt__mono")?.textContent?.trim() || "receipt";
    const prevTitle = document.title;
    document.title = "Payment-Receipt-" + orderId;
    window.print();
    window.addEventListener(
      "afterprint",
      function restore() {
        document.title = prevTitle;
        window.removeEventListener("afterprint", restore);
      },
      { once: true },
    );
  });

  if (new URLSearchParams(window.location.search).get("print") === "1") {
    window.setTimeout(function () {
      btn.click();
    }, 400);
  }
})();
