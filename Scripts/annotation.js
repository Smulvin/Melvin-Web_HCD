const paragraphs = Array.from(document.querySelectorAll(".text p"));
const annotationPanel = document.querySelector(".annotations");
const textPanel = document.getElementById("introduction");
const annoContext = document.getElementById("anno-context");
const status = document.getElementById("anno-status");

let currentParagraph = null;
let mode = "text";
let annotationItems = [];
let activeAnnotationIndex = -1;

// Give each paragraph a stable ID
paragraphs.forEach((p, i) => {
    p.dataset.paraId = i;
    p.addEventListener("focus", () => setCurrentParagraph(p));
});

// Storage
const annotations =
    JSON.parse(localStorage.getItem("annotations")) || {};

function saveAnnotations() {
    localStorage.setItem("annotations", JSON.stringify(annotations));
}

// Track current paragraph
function setCurrentParagraph(p) {
    currentParagraph = p;
}

// Accessibility announcement
function announce(message) {
    status.textContent = "";
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
        announce("Focus op tekst");
    } else {
        annotationPanel.classList.add("mode-active");
        announce("Focus op annotaties");

        refreshAnnotationItems();
        activeAnnotationIndex = -1;
    }

    updateTextColors();
}

// Collect annotation items
function refreshAnnotationItems() {
    annotationItems = Array.from(
        document.querySelectorAll(".annotation-item")
    );
}

// 🔥 FIXED: stable focus system (no stale index dependency)
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

    const heading =
        item.querySelector(".anno-heading")?.textContent || "Annotatie";

    const text =
        item.querySelector(".anno-text")?.textContent || "";

}

// Track visible paragraph fallback
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

// Render annotations (NO scroll-triggered rerender anymore)
function renderAnnotations() {
    const list = document.getElementById("anno-list");
    list.innerHTML = "";

    const template = document.getElementById("anno-item-template");

    Object.entries(annotations).forEach(([id, anno]) => {
        const p = document.querySelector(`[data-para-id="${id}"]`);
        if (!p) return;

        const rect = p.getBoundingClientRect();
        const scrollTop = window.scrollY;

        const clone = template.content.cloneNode(true);
        const item = clone.querySelector(".annotation-item");

        item.dataset.id = id;
        item.style.position = "absolute";
        item.style.top = `${rect.top + scrollTop}px`;

        clone.querySelector(".anno-heading").textContent =
            anno.heading || "Alinea";

        clone.querySelector(".anno-text").textContent =
            anno.text;

        const deleteBtn = clone.querySelector(".delete-btn");
        const editBtn = clone.querySelector(".edit-btn");

        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            delete annotations[id];
            saveAnnotations();
            renderAnnotations();
            announce("Annotatie verwijderd");
        });

        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openAnnotationForParagraph(p, id, item);
        });

        list.appendChild(item);
    });

    refreshAnnotationItems();
}

renderAnnotations();

// OPEN annotation UI
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

        const rect = p.getBoundingClientRect();
        const scrollTop = window.scrollY;

        container.style.position = "absolute";
        container.style.top = `${rect.top + scrollTop}px`;

        document.getElementById("anno-list").appendChild(container);
    }

    container.appendChild(clone);

    textarea.focus();

    setMode("annotations");

    announce(`Annotatie maken voor ${sectionName}`);

    saveBtn.addEventListener("click", () => {
        const text = textarea.value.trim();
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
                announce(editId ? "Annotatie bijgewerkt" : "Annotatie opgeslagen");
            }
        }, 100);
    });
}

// TEXT COLOR UPDATE
function updateTextColors() {
    textPanel.style.color =
        mode === "text" ? "var(--focus-grey)" : "red";
}

// Utility
function isTypingInField(target) {
    const tag = target.tagName.toLowerCase();
    return (
        tag === "input" ||
        tag === "textarea" ||
        target.isContentEditable
    );
}

// MODE TOGGLE (ALT + Z)
document.addEventListener("keydown", (e) => {
    if (isTypingInField(e.target)) return;

    if (e.altKey && !e.shiftKey && !e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();

        const goingToAnnotations = mode === "text";
        setMode(goingToAnnotations ? "annotations" : "text");

        const target = goingToAnnotations
            ? annotationPanel
            : textPanel;

        target.scrollIntoView({ behavior: "smooth", block: "start" });

        setTimeout(() => {
            const focusable =
                target.querySelector("h1, h2, h3, [tabindex], button");
            focusable?.focus?.();
        }, 150);

        if (goingToAnnotations) {
            const firstItem = document.querySelector(".annotation-item");
            if (firstItem) {
                firstItem.focus();
                activeAnnotationIndex = 0;
            }
        }
    }
});

// CREATE ANNOTATION (ALT + X)
document.addEventListener("keydown", (e) => {
    if (isTypingInField(e.target)) return;

    if (e.altKey && !e.shiftKey && !e.ctrlKey && e.key.toLowerCase() === "x") {
        e.preventDefault();

        const target =
            currentParagraph || getVisibleParagraph();

        if (!target) return;

        openAnnotationForParagraph(target);
    }
});

document.addEventListener("keydown", (e) => {
    if (mode !== "annotations") return;

    // Only navigate BETWEEN annotation cards
    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;

    const items = getAnnotationItems();
    if (!items.length) return;

    const activeIndex = items.indexOf(
        document.activeElement.closest(".annotation-item")
    );

    if (activeIndex === -1) return;

    e.preventDefault();

    const nextIndex =
        e.key === "ArrowDown"
            ? activeIndex + 1
            : activeIndex - 1;

    focusAnnotation(nextIndex);
});

// INIT
setMode("text");