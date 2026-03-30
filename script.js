const p = document.getElementById("text");

// Only wrap text nodes, not the distorter
const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
let node;
while ((node = walker.nextNode())) {
  if (node.textContent.trim() === "") continue;

  const words = node.textContent.split(/\s+/).map(word => {
    const span = document.createElement("span");
    span.textContent = word;
    return span;
  });

  words.forEach((span, index) => {
    node.parentNode.insertBefore(span, node);
    if (index < words.length - 1) {
      node.parentNode.insertBefore(document.createTextNode(" "), node);
    }
  });

  node.parentNode.removeChild(node);
}

const distorter = document.getElementById("distorter");

function updateDistorterPosition() {
  const scrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const containerTop = distorter.parentElement.offsetTop;

  // Compute offset so the distorter is always vertically centered on screen
  const offset = scrollY + windowHeight / 2 - containerTop - distorter.offsetHeight / 2;

  distorter.style.marginTop = offset + "px";
}

// Update on scroll and resize
window.addEventListener("scroll", updateDistorterPosition);
window.addEventListener("resize", updateDistorterPosition);
updateDistorterPosition();