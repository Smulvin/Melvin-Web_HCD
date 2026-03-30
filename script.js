// Prompts: 
// Write me a a script that makes each word in the p a span and wrap those around the sticky distorter element
// Almost worked. I can see that words are moving according to that circle, but the different spans are moving into each other and the actual width of the circle isnt properly calculated I think

// Grab the paragraph
const p = document.getElementById("text");

// Save original text for screen readers
const originalText = p.textContent.trim();
p.setAttribute("aria-label", originalText); // screen readers will read this

// Wrap each word in a span (for visual layout) and hide from screen readers
const words = originalText.split(/\s+/);
p.textContent = "";

words.forEach(word => {
  const span = document.createElement("span");
  span.textContent = word + " ";
  span.setAttribute("aria-hidden", "true"); // hide spans from screen readers
  p.appendChild(span);
});

// Grab distorter and inputs
const distorter = document.getElementById("distorter");
const sizeInput = document.getElementById("distortion-size");
const xInput = document.getElementById("distortion-x");
const yInput = document.getElementById("distortion-y");

// Load saved slider values from localStorage if available
const savedValues = JSON.parse(localStorage.getItem("distorterValues")) || {};
sizeInput.value = savedValues.size ?? 60; // default 60 if nothing saved
xInput.value = savedValues.x ?? 50;
yInput.value = savedValues.y ?? 50;

// Log the loaded values
console.log("Loaded slider values:", { size: sizeInput.value, x: xInput.value, y: yInput.value });

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

  wrapWords(); // recalc wrapping whenever distorter moves

  // Save current values to localStorage
  const currentValues = {
    size: sizeInput.value,
    x: xInput.value,
    y: yInput.value
  };
  localStorage.setItem("distorterValues", JSON.stringify(currentValues));
  console.log("Saved slider values:", currentValues);
}

//  Circle-wrapping logic
function wrapWords() {
  const rect = distorter.getBoundingClientRect();
  const radius = rect.width / 2;
  const centerX = rect.left + radius;
  const centerY = rect.top + radius;
  const padding = 4; // spacing between text and circle

  document.querySelectorAll("#text span").forEach(span => {
    const spanRect = span.getBoundingClientRect();
    const spanYTop = spanRect.top;
    const spanYBottom = spanRect.bottom;

    // vertical distance from circle center
    const dyTop = spanYTop - centerY;
    const dyBottom = spanYBottom - centerY;

    if (dyBottom > -radius && dyTop < radius) {
      // span intersects vertically, calculate horizontal offset using circle
      const y = Math.min(Math.max(dyTop, -radius), radius);
      const offset = Math.sqrt(radius * radius - y * y) + padding;
      const dx = spanRect.left + spanRect.width / 2 < centerX ? -offset : offset;
      span.style.transform = `translateX(${dx}px)`;
    } else {
      span.style.transform = "translateX(0px)";
    }
  });
}

// Event listeners
sizeInput.addEventListener("input", updateDistorter);
xInput.addEventListener("input", updateDistorter);
yInput.addEventListener("input", updateDistorter);

window.addEventListener("scroll", wrapWords);
window.addEventListener("resize", () => {
  updateDistorter();
  wrapWords();
});

// Initial setup
updateDistorter();