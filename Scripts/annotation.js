const paragraphs = Array.from(document.querySelectorAll(".text p"));
const annotationPanel = document.querySelector(".annotations");
const textPanel = document.getElementById("introduction");
const status = document.getElementById("anno-status");

let currentParagraph = null;
let lastFocusedParagraph = null;
let mode = "text";
let annotationItems = [];
let activeAnnotationIndex = -1;

// 🔥 NEW: controls auto-focus behavior when entering annotation mode
let focusOnEnterAnnotations = true;

// Give each paragraph a stable ID
paragraphs.forEach((p, i) => {
    p.dataset.paraId = i;

    p.addEventListener("focus", () => {
        setCurrentParagraph(p);
        lastFocusedParagraph = p;
    });
});

// Storage
const annotations =
    JSON.parse(localStorage.getItem("annotations")) || {};

function saveAnnotations() {
    localStorage.setItem("annotations", JSON.stringify(annotations));
}

function setCurrentParagraph(p) {
    currentParagraph = p;
}

function announce(message) {
    requestAnimationFrame(() => {
        status.textContent = message;
    });
}

// MODE SWITCH
function setMode(nextMode) {
    mode = nextMode;

    textPanel.classList.remove("mode-active");
    annotationPanel.classList.remove("mode-active");

    if (mode === "text") {
        textPanel.classList.add("mode-active");

        requestAnimationFrame(() => {
            const target =
                lastFocusedParagraph ||
                currentParagraph ||
                document.querySelector(".text p");

            if (!target) return;

            target.setAttribute("tabindex", "0");
            target.focus();

            currentParagraph = target;

            target.scrollIntoView({
                block: "center",
                behavior: "smooth"
            });
        });
    } else {
        annotationPanel.classList.add("mode-active");

        refreshAnnotationItems();
        activeAnnotationIndex = -1;

        requestAnimationFrame(() => {
            const items = getAnnotationItems();

            // 🔥 NEW: skip auto-focus if coming from Alt+X
            if (!focusOnEnterAnnotations) {
                focusOnEnterAnnotations = true; // reset for next time
                return;
            }

            const targetParagraph =
                lastFocusedParagraph ||
                currentParagraph;

            // no annotations at all
            if (items.length === 0) {
                announce("Nog geen annotatie gemaakt");
                return;
            }

            const found = focusAnnotationByParagraph(targetParagraph);

            // fallback
            if (!found) {
                const first = document.querySelector(".annotation-item");

                if (first) {
                    first.setAttribute("tabindex", "0");
                    first.focus();
                    activeAnnotationIndex = 0;
                }
            }
        });
    }

    updateTextColors();
}

// 🔥 Focus annotation belonging to paragraph
function focusAnnotationByParagraph(p) {
    if (!p) return false;

    const id = p.dataset.paraId;
    const items = getAnnotationItems();

    const index = items.findIndex(el => el.dataset.id === id);

    if (index !== -1) {
        focusAnnotation(index);
        return true;
    }

    return false;
}

// Collect annotation items
function refreshAnnotationItems() {
    annotationItems = Array.from(
        document.querySelectorAll(".annotation-item")
    );
}

function getAnnotationItems() {
    return Array.from(document.querySelectorAll(".annotation-item"));
}

function focusAnnotation(index) {
    const items = getAnnotationItems();
    if (!items.length) return;

    activeAnnotationIndex =
        (index + items.length) % items.length;

    const item = items[activeAnnotationIndex];
    if (!item) return;

    item.focus();
    item.scrollIntoView({ block: "center", behavior: "smooth" });
}

// fallback visible paragraph
function getVisibleParagraph() {
    let closest = null;
    let minDistance = Infinity;

    paragraphs.forEach(p => {
        const rect = p.getBoundingClientRect();
        const distance = Math.abs(rect.top);

        if (distance < minDistance) {
            minDistance = distance;
            closest = p;
        }
    });

    return closest;
}

function getVisualCenterY(el) {
    const range = document.createRange();
    range.selectNodeContents(el);

    const rects = range.getClientRects();
    if (!rects.length)
        return el.getBoundingClientRect().top + window.scrollY;

    const first = rects[0];
    const last = rects[rects.length - 1];

    return (first.top + last.bottom) / 2 + window.scrollY;
}

// =====================
// RENDER ANNOTATIONS
// =====================
function renderAnnotations() {
    const list = document.getElementById("anno-list");
    const template = document.getElementById("anno-item-template");

    list.innerHTML = "";

    Object.entries(annotations).forEach(([id, anno]) => {
        const p = document.querySelector(`[data-para-id="${id}"]`);
        if (!p) return;

        const y = getVisualCenterY(p);

        const clone = template.content.cloneNode(true);
        const item = clone.querySelector(".annotation-item");

        item.dataset.id = id;
        item.style.position = "absolute";
        item.style.top = `${y}px`;
        item.style.transform = "translateY(-150%)";

        clone.querySelector(".anno-heading").textContent =
            anno.heading || "Alinea";

        clone.querySelector(".anno-text").textContent =
            anno.text;

        clone.querySelector(".delete-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            delete annotations[id];
            saveAnnotations();
            renderAnnotations();
            announce("Annotatie verwijderd");
        });

        clone.querySelector(".edit-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            openAnnotationForParagraph(p, id, item);
        });

        list.appendChild(clone);
    });

    refreshAnnotationItems();
}

renderAnnotations();

// =====================
// OPEN ANNOTATION
// =====================
function openAnnotationForParagraph(p, editId = null, existingItem = null) {
    const h4 =
        p.previousElementSibling?.tagName === "H4"
            ? p.previousElementSibling
            : null;

    const existing = editId ? annotations[editId] : null;

    const template = document.getElementById("anno-editor-template");
    const clone = template.content.cloneNode(true);

    const headingEl = clone.querySelector(".anno-heading");
    const textarea = clone.querySelector("#anno-input");
    const saveBtn = clone.querySelector("#save-anno");

    const sectionName = h4 ? h4.innerText : "geen sectie";

    headingEl.textContent = sectionName;
    textarea.value = existing ? existing.text : "";

    let container;

    if (existingItem) {
        container = existingItem;
        container.innerHTML = "";
    } else {
        container = document.createElement("div");
        container.className = "anno-new";
        document.getElementById("anno-list").appendChild(container);
    }

    const y = getVisualCenterY(p);

    container.style.position = "absolute";
    container.style.top = `${y}px`;
    container.style.transform = "translateY(-150%)";

    container.appendChild(clone);

    textarea.focus();

    // 🔥 IMPORTANT: ensure Alt+X does NOT auto-focus list
    focusOnEnterAnnotations = false;

    setMode("annotations");

    saveBtn.addEventListener("click", () => {
        const text = textarea.value.trim();

        const saveSound = new Audio("Assets/SFX/hammer.mp3");

        announce("Annotatie opgeslagen");
        saveSound.currentTime = 0;
        saveSound.volume = 0.1;
        saveSound.play();

        if (!text) return;

        const id = editId ?? p.dataset.paraId;

        annotations[id] = {
            text,
            heading: sectionName,
        };

        saveAnnotations();
        renderAnnotations();

        setMode("text");

        setTimeout(() => {
            const paragraph = document.querySelector(`[data-para-id="${id}"]`);
            if (paragraph) {
                paragraph.focus();
                paragraph.scrollIntoView({ block: "center" });
            }
        }, 100);
    });
}

// =====================
// UI
// =====================
function updateTextColors() {
    textPanel.style.color =
        mode === "text" ? "var(--focus-grey)" : "red";
}

function isTypingInField(target) {
    const tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || target.isContentEditable;
}

// MODE TOGGLE
document.addEventListener("keydown", (e) => {
    if (isTypingInField(e.target)) return;

    if (e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();

        const goingToAnnotations = mode === "text";
        setMode(goingToAnnotations ? "annotations" : "text");

        const target =
            goingToAnnotations ? annotationPanel : textPanel;

        target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
});

// CREATE ANNOTATION
document.addEventListener("keydown", (e) => {
    if (isTypingInField(e.target)) return;

    if (e.altKey && e.key.toLowerCase() === "x") {
        e.preventDefault();

        const target =
            currentParagraph || getVisibleParagraph();

        if (!target) return;

        focusOnEnterAnnotations = false; // 🔥 KEY FIX

        openAnnotationForParagraph(target);
    }
});

// NAVIGATION
document.addEventListener("keydown", (e) => {
    if (mode !== "annotations") return;
    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;

    const items = getAnnotationItems();
    if (!items.length) return;

    const activeIndex = items.indexOf(
        document.activeElement.closest(".annotation-item")
    );

    if (activeIndex === -1) return;

    e.preventDefault();

    focusAnnotation(
        e.key === "ArrowDown"
            ? activeIndex + 1
            : activeIndex - 1
    );
});

// INIT
function initAnnotations() {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            renderAnnotations();
        });
    });
}

window.addEventListener("load", initAnnotations);
window.addEventListener("resize", renderAnnotations);

setMode("text");