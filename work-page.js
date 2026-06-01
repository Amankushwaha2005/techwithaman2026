/**
 * =============================================================================
 * CLIENT — work-page.js
 * URL: /work
 * Category-based role selector for hiring form
 * =============================================================================
 */

(function () {
  var categoryEl = document.getElementById("workCategory");
  var skillEl = document.getElementById("workSkill");
  if (!categoryEl || !skillEl) return;

  var roleMap = {
    "Development & IT": [
      "Frontend Developer",
      "Backend Developer",
      "Full Stack Developer",
      "WordPress Developer",
      "QA / Testing Engineer",
    ],
    "Design & Creative": [
      "UI/UX Designer",
      "Graphic Designer",
      "Logo Designer",
      "Social Media Designer",
      "Content Writer",
    ],
    "Admin & Support": [
      "Virtual Assistant",
      "Customer Support Executive",
      "Data Entry Operator",
      "Project Coordinator",
    ],
    "Video & Audio": [
      "Video Editor",
      "Motion Graphics Editor",
      "Subtitle Writer",
      "Audio Editor",
    ],
    "AI & Automation": [
      "AI Prompt Engineer",
      "Automation Specialist",
      "Chatbot Builder",
      "No-Code Workflow Expert",
    ],
  };

  function setOptions(category) {
    var roles = roleMap[category] || [];
    skillEl.innerHTML = "";

    var first = document.createElement("option");
    first.value = "";
    first.textContent = roles.length ? "Select role / skill" : "First select a category";
    skillEl.appendChild(first);

    roles.forEach(function (role) {
      var opt = document.createElement("option");
      opt.value = role;
      opt.textContent = role;
      skillEl.appendChild(opt);
    });

    skillEl.disabled = roles.length === 0;
    skillEl.value = "";
  }

  categoryEl.addEventListener("change", function () {
    setOptions(categoryEl.value);
  });
})();

