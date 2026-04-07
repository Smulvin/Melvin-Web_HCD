// Grab all paragraphs inside .text
const paragraphs = document.querySelectorAll(".text p");

paragraphs.forEach(p => {
  const originalText = p.textContent.trim();

  // Clear paragraph first
  p.textContent = "";

  // Create a hidden span for screen readers
  const srSpan = document.createElement("span");
  srSpan.classList.add("sr-only");
  srSpan.textContent = originalText;
  p.appendChild(srSpan);

  // Create spans for each word (for distortion), aria-hidden
  originalText.split(/\s+/).forEach(word => {
    const span = document.createElement("span");
    span.textContent = word + " ";
    span.setAttribute("aria-hidden", "true");
    p.appendChild(span);
  });
});

// Grab distorter and inputs
const distorter = document.getElementById("distorter");
const sizeInput = document.getElementById("distortion-size");
const xInput = document.getElementById("distortion-x");
const yInput = document.getElementById("distortion-y");

// Load saved slider values from localStorage if available
const savedValues = JSON.parse(localStorage.getItem("distorterValues")) || {};
sizeInput.value = savedValues.size ?? 60;
xInput.value = savedValues.x ?? 50;
yInput.value = savedValues.y ?? 50;

// Update distorter position and size
function updateDistorter() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const size = 50 + sizeInput.value * 2; // min 50px, max ~250px
  const x = (xInput.value / 100) * viewportWidth;
  const y = (yInput.value / 100) * viewportHeight;

  distorter.style.width = `${size}px`;
  distorter.style.height = `${size}px`;
  distorter.style.left = `${x}px`;
  distorter.style.top = `${y}px`;
  distorter.style.transform = `translate(-50%, -50%)`;

  requestAnimationFrame(wrapWords); // recalc wrapping whenever distorter moves

  // Save current values
  const currentValues = { size: sizeInput.value, x: xInput.value, y: yInput.value };
  localStorage.setItem("distorterValues", JSON.stringify(currentValues));
}

// Circle-wrapping logic
function wrapWords() {
  const rect = distorter.getBoundingClientRect();
  const radius = rect.width / 2;
  const centerX = rect.left + radius;
  const centerY = rect.top + radius;
  const padding = 4;

  document.querySelectorAll(".text p span").forEach(span => {
    const spanRect = span.getBoundingClientRect();
    const spanCenterY = (spanRect.top + spanRect.bottom) / 2;
    const dy = spanCenterY - centerY;

    if (Math.abs(dy) < radius) {
      const offset = Math.sqrt(radius * radius - dy * dy) + padding;
      const spanCenterX = (spanRect.left + spanRect.right) / 2;
      const dx = spanCenterX < centerX ? -offset : offset;
      span.style.transform = `translateX(${dx}px)`;
    } else {
      span.style.transform = "translateX(0px)";
    }
  });

  applyZebraLines();
}

function applyZebraLines() {
  const lines = new Map();

  // Group spans by their vertical position (line)
  document.querySelectorAll(".text p span").forEach(span => {
    const top = Math.round(span.getBoundingClientRect().top);

    if (!lines.has(top)) {
      lines.set(top, []);
    }
    lines.get(top).push(span);
  });

  const yellow = "#FFD400";
  const dark = "#2E2E2E";

  let lineIndex = 0;

  lines.forEach(lineSpans => {
    const isEven = lineIndex % 2 === 0;

    const bg = isEven ? yellow : dark;
    const color = isEven ? dark : yellow;

    lineSpans.forEach(span => {
      span.style.backgroundColor = bg;
      span.style.color = color;
    });

    lineIndex++;
  });
}

// Event listeners
sizeInput.addEventListener("input", updateDistorter);
xInput.addEventListener("input", updateDistorter);
yInput.addEventListener("input", updateDistorter);
window.addEventListener("scroll", wrapWords);
window.addEventListener("resize", () => { updateDistorter(); wrapWords(); });

// Initial setup
updateDistorter();