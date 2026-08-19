/* =========================================================
   ADGVMaker
   by Tech Karol
   app.js
========================================================= */

"use strict";


/* =========================================================
   STATE
========================================================= */

const state = {
    elements: [],
    selectedId: null,
    projectName: "Moja reklama",
    duration: 10,
    currentTime: 0,
    isPlaying: false,
    format: {
        width: 1920,
        height: 1080
    }
};


/* =========================================================
   DOM
========================================================= */

const canvas = document.getElementById("canvas");
const canvasPlaceholder = document.getElementById("canvasPlaceholder");

const propertiesPanel = document.getElementById("propertiesPanel");

const mediaTrack = document.getElementById("mediaTrack");
const textTrack = document.getElementById("textTrack");
const graphicsTrack = document.getElementById("graphicsTrack");

const imageInput = document.getElementById("imageInput");
const videoInput = document.getElementById("videoInput");
const logoInput = document.getElementById("logoInput");

const formatSelect = document.getElementById("formatSelect");

const currentTimeElement = document.getElementById("currentTime");
const durationElement = document.getElementById("duration");


/* =========================================================
   UTILS
========================================================= */

function generateId() {
    return "element-" + Date.now() + "-" +
        Math.random().toString(36).substring(2, 8);
}


function formatTime(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
}


function getSelectedElement() {
    return state.elements.find(
        element => element.id === state.selectedId
    );
}


function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}


/* =========================================================
   ELEMENT CREATION
========================================================= */

function createElement(type, data = {}) {

    const element = {
        id: generateId(),

        type,

        x: data.x ?? 100,
        y: data.y ?? 100,

        width: data.width ?? 400,
        height: data.height ?? 200,

        rotation: data.rotation ?? 0,

        opacity: data.opacity ?? 1,

        start: data.start ?? 0,
        duration: data.duration ?? state.duration,

        text: data.text ?? "Nowy tekst",

        fontSize: data.fontSize ?? 64,
        fontFamily: data.fontFamily ?? "Arial",
        fontWeight: data.fontWeight ?? "700",

        color: data.color ?? "#ffffff",

        src: data.src ?? null,

        name: data.name ?? type
    };

    state.elements.push(element);

    selectElement(element.id);

    render();

    return element;
}


/* =========================================================
   RENDER
========================================================= */

function render() {

    renderCanvas();

    renderTimeline();

    renderProperties();

    updatePlaceholder();

    updateTimeDisplay();
}


/* =========================================================
   CANVAS
========================================================= */

function renderCanvas() {

    const oldElements = canvas.querySelectorAll(
        ".adgvmaker-element"
    );

    oldElements.forEach(element => element.remove());


    state.elements.forEach(element => {

        const node = document.createElement("div");

        node.className = "adgvmaker-element";

        node.dataset.id = element.id;

        node.style.position = "absolute";

        node.style.left = element.x + "px";
        node.style.top = element.y + "px";

        node.style.width = element.width + "px";
        node.style.height = element.height + "px";

        node.style.opacity = element.opacity;

        node.style.transform =
            `rotate(${element.rotation}deg)`;

        node.style.cursor = "move";

        node.style.boxSizing = "border-box";


        if (element.id === state.selectedId) {

            node.style.outline =
                "2px solid #4da3ff";

            node.style.outlineOffset =
                "2px";
        }


        /* TEXT */

        if (element.type === "text") {

            node.textContent = element.text;

            node.style.fontSize =
                element.fontSize + "px";

            node.style.fontFamily =
                element.fontFamily;

            node.style.fontWeight =
                element.fontWeight;

            node.style.color =
                element.color;

            node.style.display =
                "flex";

            node.style.alignItems =
                "center";

            node.style.justifyContent =
                "center";

            node.style.textAlign =
                "center";

            node.style.userSelect =
                "none";

            node.style.overflow =
                "hidden";
        }


        /* IMAGE */

        if (
            element.type === "image" ||
            element.type === "logo"
        ) {

            const image = document.createElement("img");

            image.src = element.src;

            image.draggable = false;

            image.style.width = "100%";
            image.style.height = "100%";

            image.style.objectFit = "contain";

            image.style.pointerEvents = "none";

            node.appendChild(image);
        }


        /* VIDEO */

        if (element.type === "video") {

            const video = document.createElement("video");

            video.src = element.src;

            video.muted = true;

            video.loop = true;

            video.controls = false;

            video.style.width = "100%";
            video.style.height = "100%";

            video.style.objectFit = "cover";

            video.style.pointerEvents = "none";

            node.appendChild(video);
        }


        node.addEventListener(
            "pointerdown",
            startDragging
        );


        canvas.appendChild(node);
    });
}


/* =========================================================
   PLACEHOLDER
========================================================= */

function updatePlaceholder() {

    if (!canvasPlaceholder) {
        return;
    }

    canvasPlaceholder.style.display =
        state.elements.length === 0
            ? "flex"
            : "none";
}


/* =========================================================
   DRAGGING
========================================================= */

let dragging = null;


function startDragging(event) {

    event.preventDefault();

    const id =
        event.currentTarget.dataset.id;

    selectElement(id);

    const element =
        getSelectedElement();

    if (!element) {
        return;
    }


    const rect =
        canvas.getBoundingClientRect();


    dragging = {

        id,

        offsetX:
            event.clientX -
            rect.left -
            element.x,

        offsetY:
            event.clientY -
            rect.top -
            element.y
    };


    window.addEventListener(
        "pointermove",
        dragElement
    );

    window.addEventListener(
        "pointerup",
        stopDragging
    );
}


function dragElement(event) {

    if (!dragging) {
        return;
    }


    const element =
        state.elements.find(
            item => item.id === dragging.id
        );


    if (!element) {
        return;
    }


    const rect =
        canvas.getBoundingClientRect();


    let x =
        event.clientX -
        rect.left -
        dragging.offsetX;


    let y =
        event.clientY -
        rect.top -
        dragging.offsetY;


    x = clamp(
        x,
        0,
        state.format.width -
        element.width
    );


    y = clamp(
        y,
        0,
        state.format.height -
        element.height
    );


    element.x = x;
    element.y = y;


    render();
}


function stopDragging() {

    dragging = null;

    window.removeEventListener(
        "pointermove",
        dragElement
    );

    window.removeEventListener(
        "pointerup",
        stopDragging
    );
}


/* =========================================================
   SELECTION
========================================================= */

function selectElement(id) {

    state.selectedId = id;

    render();
}


/* =========================================================
   PROPERTIES PANEL
========================================================= */

function renderProperties() {

    const element =
        getSelectedElement();


    if (!element) {

        propertiesPanel.innerHTML = `
            <div class="no-selection">
                <div class="no-selection-icon">⚙️</div>

                <p>
                    Wybierz element na płótnie,
                    aby edytować jego właściwości.
                </p>
            </div>
        `;

        return;
    }


    propertiesPanel.innerHTML = `
        <div class="property-group">

            <label>Nazwa</label>

            <input
                id="propertyName"
                type="text"
                value="${escapeHtml(element.name)}"
            >

        </div>


        <div class="property-group">

            <label>X</label>

            <input
                id="propertyX"
                type="number"
                value="${Math.round(element.x)}"
            >

        </div>


        <div class="property-group">

            <label>Y</label>

            <input
                id="propertyY"
                type="number"
                value="${Math.round(element.y)}"
            >

        </div>


        <div class="property-group">

            <label>Szerokość</label>

            <input
                id="propertyWidth"
                type="number"
                min="1"
                value="${Math.round(element.width)}"
            >

        </div>


        <div class="property-group">

            <label>Wysokość</label>

            <input
                id="propertyHeight"
                type="number"
                min="1"
                value="${Math.round(element.height)}"
            >

        </div>


        <div class="property-group">

            <label>Przezroczystość</label>

            <input
                id="propertyOpacity"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value="${element.opacity}"
            >

        </div>


        <div class="property-group">

            <label>Obrót</label>

            <input
                id="propertyRotation"
                type="number"
                value="${element.rotation}"
            >

        </div>


        ${
            element.type === "text"
            ? `
                <div class="property-group">

                    <label>Tekst</label>

                    <textarea
                        id="propertyText"
                        rows="4"
                    >${escapeHtml(element.text)}</textarea>

                </div>


                <div class="property-group">

                    <label>Rozmiar tekstu</label>

                    <input
                        id="propertyFontSize"
                        type="number"
                        min="1"
                        value="${element.fontSize}"
                    >

                </div>


                <div class="property-group">

                    <label>Kolor</label>

                    <input
                        id="propertyColor"
                        type="color"
                        value="${element.color}"
                    >

                </div>
            `
            : ""
        }


        <button
            id="deleteElementBtn"
            class="danger-button"
        >
            🗑️ Usuń element
        </button>
    `;


    connectPropertyEvents();
}


function connectPropertyEvents() {

    const element =
        getSelectedElement();

    if (!element) {
        return;
    }


    const bind = (
        id,
        callback
    ) => {

        const input =
            document.getElementById(id);

        if (!input) {
            return;
        }

        input.addEventListener(
            "input",
            callback
        );
    };


    bind(
        "propertyName",
        event => {
            element.name =
                event.target.value;

            renderCanvas();
            renderTimeline();
        }
    );


    bind(
        "propertyX",
        event => {
            element.x =
                Number(event.target.value) || 0;

            renderCanvas();
        }
    );


    bind(
        "propertyY",
        event => {
            element.y =
                Number(event.target.value) || 0;

            renderCanvas();
        }
    );


    bind(
        "propertyWidth",
        event => {
            element.width =
                Math.max(
                    1,
                    Number(event.target.value) || 1
                );

            renderCanvas();
        }
    );


    bind(
        "propertyHeight",
        event => {
            element.height =
                Math.max(
                    1,
                    Number(event.target.value) || 1
                );

            renderCanvas();
        }
    );


    bind(
        "propertyOpacity",
        event => {
            element.opacity =
                Number(event.target.value);

            renderCanvas();
        }
    );


    bind(
        "propertyRotation",
        event => {
            element.rotation =
                Number(event.target.value) || 0;

            renderCanvas();
        }
    );


    bind(
        "propertyText",
        event => {
            element.text =
                event.target.value;

            renderCanvas();
        }
    );


    bind(
        "propertyFontSize",
        event => {
            element.fontSize =
                Math.max(
                    1,
                    Number(event.target.value) || 1
                );

            renderCanvas();
        }
    );


    bind(
        "propertyColor",
        event => {
            element.color =
                event.target.value;

            renderCanvas();
        }
    );


    const deleteButton =
        document.getElementById(
            "deleteElementBtn"
        );


    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            deleteSelectedElement
        );
    }
}


/* =========================================================
   TEXT
========================================================= */

document
    .getElementById("addTextBtn")
    .addEventListener(
        "click",
        () => {

            createElement(
                "text",
                {
                    name: "Tekst",
                    text: "PROMOCJA!",
                    x: 200,
                    y: 200,
                    width: 700,
                    height: 120,
                    fontSize: 72
                }
            );

        }
    );


/* =========================================================
   IMAGE
========================================================= */

document
    .getElementById("addImageBtn")
    .addEventListener(
        "click",
        () => {
            imageInput.click();
        }
    );


imageInput.addEventListener(
    "change",
    event => {

        const file =
            event.target.files[0];

        if (!file) {
            return;
        }


        const url =
            URL.createObjectURL(file);


        createElement(
            "image",
            {
                name: file.name,
                src: url,
                x: 150,
                y: 150,
                width: 600,
                height: 400
            }
        );


        imageInput.value = "";
    }
);


/* =========================================================
   VIDEO
========================================================= */

document
    .getElementById("addVideoBtn")
    .addEventListener(
        "click",
        () => {
            videoInput.click();
        }
    );


videoInput.addEventListener(
    "change",
    event => {

        const file =
            event.target.files[0];

        if (!file) {
            return;
        }


        const url =
            URL.createObjectURL(file);


        createElement(
            "video",
            {
                name: file.name,
                src: url,
                x: 0,
                y: 0,
                width: state.format.width,
                height: state.format.height
            }
        );


        videoInput.value = "";
    }
);


/* =========================================================
   LOGO
========================================================= */

document
    .getElementById("addLogoBtn")
    .addEventListener(
        "click",
        () => {
            logoInput.click();
        }
    );


logoInput.addEventListener(
    "change",
    event => {

        const file =
            event.target.files[0];

        if (!file) {
            return;
        }


        const url =
            URL.createObjectURL(file);


        createElement(
            "logo",
            {
                name: "Logo",
                src: url,
                x: 100,
                y: 100,
                width: 300,
                height: 150
            }
        );


        logoInput.value = "";
    }
);


/* =========================================================
   ICON
========================================================= */

document
    .getElementById("addIconBtn")
    .addEventListener(
        "click",
        () => {

            createElement(
                "text",
                {
                    name: "Ikona",
                    text: "★",
                    x: 300,
                    y: 300,
                    width: 150,
                    height: 150,
                    fontSize: 120,
                    color: "#ffffff"
                }
            );

        }
    );


/* =========================================================
   DELETE
========================================================= */

function deleteSelectedElement() {

    if (!state.selectedId) {
        return;
    }


    state.elements =
        state.elements.filter(
            element =>
                element.id !== state.selectedId
        );


    state.selectedId = null;

    render();
}


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Delete" ||
            event.key === "Backspace"
        ) {

            const active =
                document.activeElement;

            const isInput =
                active &&
                (
                    active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    active.tagName === "SELECT"
                );


            if (!isInput) {
                deleteSelectedElement();
            }
        }
    }
);


/* =========================================================
   TIMELINE
========================================================= */

function renderTimeline() {

    mediaTrack.innerHTML = "";
    textTrack.innerHTML = "";
    graphicsTrack.innerHTML = "";


    state.elements.forEach(element => {

        const item =
            document.createElement("div");


        item.className =
            "timeline-item";


        item.textContent =
            element.name;


        item.dataset.id =
            element.id;


        item.style.left =
            (
                element.start /
                state.duration *
                100
            ) + "%";


        item.style.width =
            (
                element.duration /
                state.duration *
                100
            ) + "%";


        item.addEventListener(
            "click",
            () => selectElement(element.id)
        );


        if (element.type === "text") {

            textTrack.appendChild(item);

        } else if (
            element.type === "image" ||
            element.type === "logo"
        ) {

            graphicsTrack.appendChild(item);

        } else {

            mediaTrack.appendChild(item);
        }
    });
}


/* =========================================================
   FORMAT
========================================================= */

formatSelect.addEventListener(
    "change",
    event => {

        const [width, height] =
            event.target.value
                .split("x")
                .map(Number);


        state.format.width =
            width;

        state.format.height =
            height;


        canvas.dataset.width =
            width;

        canvas.dataset.height =
            height;


        canvas.style.aspectRatio =
            `${width} / ${height}`;


        renderCanvas();
    }
);


/* =========================================================
   NEW PROJECT
========================================================= */

document
    .getElementById("newProjectBtn")
    .addEventListener(
        "click",
        () => {

            const confirmed =
                state.elements.length === 0 ||
                confirm(
                    "Czy na pewno utworzyć nowy projekt?"
                );


            if (!confirmed) {
                return;
            }


            state.elements = [];

            state.selectedId = null;

            state.currentTime = 0;

            render();
        }
    );


/* =========================================================
   SAVE PROJECT
========================================================= */

document
    .getElementById("saveProjectBtn")
    .addEventListener(
        "click",
        saveProject
    );


function saveProject() {

    const project = {

        version: 1,

        name: state.projectName,

        duration: state.duration,

        format: state.format,

        elements: state.elements.map(
            element => ({
                ...element
            })
        )
    };


    const blob =
        new Blob(
            [
                JSON.stringify(
                    project,
                    null,
                    2
                )
            ],
            {
                type: "application/json"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        "adgvmaker-project.json";


    link.click();


    URL.revokeObjectURL(url);
}


/* =========================================================
   PLAYBACK
========================================================= */

document
    .getElementById("playBtn")
    .addEventListener(
        "click",
        () => {

            state.isPlaying = true;

            startPlayback();
        }
    );


document
    .getElementById("pauseBtn")
    .addEventListener(
        "click",
        () => {

            state.isPlaying = false;
        }
    );


document
    .getElementById("stopBtn")
    .addEventListener(
        "click",
        () => {

            state.isPlaying = false;

            state.currentTime = 0;

            updateTimeDisplay();
        }
    );


let playbackLastTime = null;


function startPlayback(timestamp) {

    if (!state.isPlaying) {
        playbackLastTime = null;
        return;
    }


    if (playbackLastTime === null) {
        playbackLastTime = timestamp;
    }


    const delta =
        (timestamp - playbackLastTime) / 1000;


    playbackLastTime = timestamp;


    state.currentTime += delta;


    if (
        state.currentTime >=
        state.duration
    ) {

        state.currentTime = 0;
    }


    updateTimeDisplay();


    requestAnimationFrame(
        startPlayback
    );
}


function updateTimeDisplay() {

    currentTimeElement.textContent =
        formatTime(state.currentTime);

    durationElement.textContent =
        formatTime(state.duration);
}


/* =========================================================
   TEMPLATES
========================================================= */

document
    .querySelectorAll(".template-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const template =
                    button.dataset.template;

                loadTemplate(template);
            }
        );
    });


function loadTemplate(template) {

    state.elements = [];

    state.selectedId = null;


    switch (template) {

        case "product":

            createElement(
                "text",
                {
                    name: "Nagłówek",
                    text: "NOWY PRODUKT!",
                    x: 200,
                    y: 150,
                    width: 900,
                    height: 150,
                    fontSize: 80
                }
            );

            createElement(
                "text",
                {
                    name: "Opis",
                    text: "Sprawdź już teraz",
                    x: 300,
                    y: 350,
                    width: 700,
                    height: 100,
                    fontSize: 48
                }
            );

            break;


        case "sale":

            createElement(
                "text",
                {
                    name: "Promocja",
                    text: "PROMOCJA -30%",
                    x: 200,
                    y: 200,
                    width: 1000,
                    height: 180,
                    fontSize: 96
                }
            );

            createElement(
                "text",
                {
                    name: "Call to action",
                    text: "KUP TERAZ!",
                    x: 500,
                    y: 450,
                    width: 600,
                    height: 120,
                    fontSize: 64
                }
            );

            break;


        case "business":

            createElement(
                "text",
                {
                    name: "Firma",
                    text: "TWOJA FIRMA",
                    x: 300,
                    y: 200,
                    width: 900,
                    height: 150,
                    fontSize: 80
                }
            );

            createElement(
                "text",
                {
                    name: "Slogan",
                    text: "Profesjonalne rozwiązania",
                    x: 300,
                    y: 400,
                    width: 900,
                    height: 100,
                    fontSize: 48
                }
            );

            break;


        case "gaming":

            createElement(
                "text",
                {
                    name: "Gaming",
                    text: "GAME ON!",
                    x: 300,
                    y: 250,
                    width: 1000,
                    height: 200,
                    fontSize: 120
                }
            );

            break;
    }


    render();
}


/* =========================================================
   EXPORT
========================================================= */

document
    .getElementById("exportBtn")
    .addEventListener(
        "click",
        () => {

            alert(
                "Eksport MP4 dodamy w kolejnym etapie z użyciem FFmpeg.wasm."
            );
        }
    );


/* =========================================================
   CANVAS CLICK
========================================================= */

canvas.addEventListener(
    "pointerdown",
    event => {

        if (
            event.target === canvas ||
            event.target === canvasPlaceholder
        ) {

            state.selectedId = null;

            render();
        }
    }
);


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   INITIALIZATION
========================================================= */

function initialize() {

    canvas.style.aspectRatio =
        `${state.format.width} / ${state.format.height}`;

    render();

    console.log(
        "ADGVMaker initialized — by Tech Karol"
    );
}


initialize();
