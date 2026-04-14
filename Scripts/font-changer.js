const fontSelector = document.getElementById("font-selector");

// Load saved font
const savedFont = localStorage.getItem("selectedFont");
if (savedFont) {
    document.body.style.fontFamily = savedFont;
    fontSelector.value = savedFont;
}

// Change font on selection
fontSelector.addEventListener("change", (e) => {
    const font = e.target.value;

    document.body.style.fontFamily = font;

    // Save preference
    localStorage.setItem("selectedFont", font);
});