const paragraphs = Array.from(document.querySelectorAll(".text p"));
const annotationPanel = document.querySelector(".annotations");
const annoContext = document.getElementById("anno-context");
const status = document.getElementById("anno-status");

// Paragraph setup
let currentParagraph = null;

// give each paragraph a stable ID
paragraphs.forEach((p, i) => {
    p.dataset.paraId = i;
    p.tabIndex = 0;

    p.addEventListener("focus", () => {
        setCurrentParagraph(p);
    });

    p.addEventListener("click", () => {
        setCurrentParagraph(p);
    });
});

// Annotation storage
const annotations =
    JSON.parse(localStorage.getItem("annotations")) || {};

// Tracking current paragraph
function setCurrentParagraph(p) {
    currentParagraph = p;
}

// 🔊 Live region helper
function announce(message) {
    status.textContent = "";

    setTimeout(() => {
        status.textContent = message;
    }, 50);
}

// Fallback: paragraph closest to viewport top
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

// Render saved annotations
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
        item.tabIndex = 0;

        item.style.position = "absolute";
        item.style.top = `${rect.top + scrollTop}px`;

        // Fill content
        clone.querySelector(".anno-heading").textContent =
            anno.heading || "Alinea";

        clone.querySelector(".anno-text").textContent =
            anno.text;

        // Buttons
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
}

renderAnnotations();

// Open annotation UI
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

    // ✅ Better accessibility (on textarea)
    textarea.setAttribute(
        "aria-label",
        `Annotatie maken ${sectionName}`
    );

    let container;

    if (existingItem) {
        // ✏️ EDIT MODE → replace existing annotation
        container = existingItem;
        container.innerHTML = "";
    } else {
        // ➕ NEW MODE
        container = document.createElement("div");
        container.className = "anno-new";

        const rect = p.getBoundingClientRect();
        const scrollTop = window.scrollY;

        container.style.position = "absolute";
        container.style.top = `${rect.top + scrollTop}px`;

        document.getElementById("anno-list").appendChild(container);
    }

    container.appendChild(clone);

    // focus
    setTimeout(() => textarea.focus(), 50);

    // SAVE
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

        // announce
        const message = editId
            ? "Annotatie bijgewerkt"
            : "Annotatie opgeslagen";

        announce(message);

        // return focus to updated annotation
        setTimeout(() => {
            const updated = document.querySelector(`[data-id="${id}"]`);
            if (updated) updated.focus();
        }, 100);
    });
}

function saveAnnotations() {
    localStorage.setItem("annotations", JSON.stringify(annotations));
}

// Keyboard shortcut → create annotation
document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();

        const target =
            currentParagraph || getVisibleParagraph();

        if (!target) return;

        openAnnotationForParagraph(target);
    }
});

// Keyboard shortcut → jump to annotations
document.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();

        document.querySelector(".annotations")
            .scrollIntoView({ behavior: "smooth" });

        setTimeout(() => {
            const firstItem = document.querySelector(".annotation-item");
            if (firstItem) firstItem.focus();
        }, 200);
    }
});

// Keep positions correct
window.addEventListener("resize", renderAnnotations);
window.addEventListener("scroll", renderAnnotations);