(function () {
  if (document.getElementById("whatsapp-float")) return;

  const link = document.createElement("a");
  link.id = "whatsapp-float";
  link.className = "whatsapp-float";
  link.href = "https://wa.me/919528252099";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", "Chat on WhatsApp");
  link.title = "Chat on WhatsApp";

  const img = document.createElement("img");
  img.className = "whatsapp-float__img";
  img.src = "/images/whatsapp-float.svg?v=2";
  img.alt = "";
  img.width = 60;
  img.height = 68;
  img.decoding = "async";

  link.appendChild(img);
  document.body.appendChild(link);
})();
