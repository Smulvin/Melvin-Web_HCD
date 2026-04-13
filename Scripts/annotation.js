const paragraphs = Array.from(document.querySelectorAll(".text p"));
const annotationPanel = document.querySelector(".annotations");
const annoContext = document.getElementById("anno-context");

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

        item.style.position = "absolute";
        item.style.top = `${rect.top + scrollTop}px`;

        // Fill content
        clone.querySelector(".anno-heading").textContent =
            anno.heading || "Alinea";

        clone.querySelector(".anno-text").textContent =
            anno.text;

        // Delete button
        const deleteBtn = clone.querySelector(".delete-btn");
        const editBtn = clone.querySelector(".edit-btn");

        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            delete annotations[id];
            saveAnnotations();
            renderAnnotations();
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

    // --- TEMPLATE ---
    const template = document.getElementById("anno-editor-template");
    const clone = template.content.cloneNode(true);

    const headingEl = clone.querySelector(".anno-heading");
    const textarea = clone.querySelector("#anno-input");
    const saveBtn = clone.querySelector("#save-anno");

    headingEl.textContent = h4 ? h4.innerText : "No section";
    textarea.value = existing ? existing.text : "";

    // --- CONTAINER LOGIC ---
    let container;

    if (existingItem) {
        // ✏️ EDIT MODE → replace existing annotation
        container = existingItem;
        container.innerHTML = "";
    } else {
        // ➕ NEW MODE → create new positioned container
        container = document.createElement("div");
        container.className = "anno-new";

        const rect = p.getBoundingClientRect();
        const scrollTop = window.scrollY;

        container.style.position = "absolute";
        container.style.top = `${rect.top + scrollTop}px`;

        document.getElementById("anno-list").appendChild(container);
    }

    container.appendChild(clone);

    // focus for accessibility
    setTimeout(() => textarea.focus(), 50);

    // --- SAVE ---
    saveBtn.addEventListener("click", () => {
        const text = textarea.value.trim();
        if (!text) return;

        const id = editId ?? p.dataset.paraId;

        annotations[id] = {
            text,
            heading: h4 ? h4.innerText : "Alinea",
        };

        saveAnnotations();
        renderAnnotations();
    });
}

function saveAnnotations() {
  localStorage.setItem("annotations", JSON.stringify(annotations));
}

// Keyboard shortcut making annotation
document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();

        const target =
            currentParagraph || getVisibleParagraph();

        if (!target) return;

        openAnnotationForParagraph(target);
    }
});

// Keyboard shortcut to open annotaions
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

window.addEventListener("resize", renderAnnotations);