/* =========================================================
   ADGVMaker
   by Tech Karol
   app.js
   Mobile-first editor
========================================================= */

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {
    version: 1,
    defaultDuration: 10,
    defaultFPS: 30,

    formats: {
        "1920x1080": {
            width: 1920,
            height: 1080,
            ratio: "16:9"
        },

        "1080x1920": {
            width: 1080,
            height: 1920,
            ratio: "9:16"
        },

        "1080x1080": {
            width: 1080,
            height: 1080,
            ratio: "1:1"
        },

        "1280x720": {
            width: 1280,
            height: 720,
            ratio: "16:9"
        }
    }
};


/* =========================================================
   STATE
========================================================= */

const state = {
    project: {
        version: CONFIG.version,
        name: "Moja reklama",
        duration: CONFIG.defaultDuration,
        fps: CONFIG.defaultFPS,

        format: {
            width: 1080,
            height: 1920,
            ratio: "9:16"
        }
    },

    elements: [],

    selectedId: null,

    playback: {
        playing: false,
        currentTime: 0,
        lastFrame: 0
    },

    history: {
        undo: [],
        redo: []
    }
};


/* =========================================================
   DOM CACHE
========================================================= */

const DOM = {
    canvas: document.getElementById("canvas"),
    placeholder: document.getElementById("canvasPlaceholder"),

    properties:
        document.getElementById("propertiesPanel"),

    mediaTrack:
        document.getElementById("mediaTrack"),

    textTrack:
        document.getElementById("textTrack"),

    graphicsTrack:
        document.getElementById("graphicsTrack"),

    imageInput:
        document.getElementById("imageInput"),

    videoInput:
        document.getElementById("videoInput"),

    logoInput:
        document.getElementById("logoInput"),

    formatSelect:
        document.getElementById("formatSelect"),

    currentTime:
        document.getElementById("currentTime"),

    duration:
        document.getElementById("duration")
};


/* =========================================================
   UTILITIES
========================================================= */

function uid(prefix = "el") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );
}


function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}


function formatTime(seconds) {

    seconds = Math.max(
        0,
        Number(seconds) || 0
    );

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(seconds % 60);

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function getElement(id) {

    return state.elements.find(
        element => element.id === id
    );
}


function getSelected() {

    return getElement(
        state.selectedId
    );
}


/* =========================================================
   HISTORY
========================================================= */

function createSnapshot() {

    return JSON.stringify({
        project: state.project,
        elements: state.elements
    });
}


function restoreSnapshot(snapshot) {

    if (!snapshot) {
        return;
    }

    const data =
        JSON.parse(snapshot);

    state.project =
        data.project;

    state.elements =
        data.elements;

    state.selectedId = null;

    renderAll();
}


function saveHistory() {

    state.history.undo.push(
        createSnapshot()
    );

    if (state.history.undo.length > 30) {
        state.history.undo.shift();
    }

    state.history.redo.length = 0;
}


function undo() {

    if (
        state.history.undo.length === 0
    ) {
        return;
    }

    state.history.redo.push(
        createSnapshot()
    );

    const snapshot =
        state.history.undo.pop();

    restoreSnapshot(snapshot);
}


function redo() {

    if (
        state.history.redo.length === 0
    ) {
        return;
    }

    state.history.undo.push(
        createSnapshot()
    );

    const snapshot =
        state.history.redo.pop();

    restoreSnapshot(snapshot);
}


/* =========================================================
   ELEMENT FACTORY
========================================================= */

function createElement(type, options = {}) {

    const element = {

        id: uid(type),

        type,

        name:
            options.name ||
            type,

        x:
            options.x ??
            state.project.format.width / 2 - 200,

        y:
            options.y ??
            state.project.format.height / 2 - 100,

        width:
            options.width ??
            400,

        height:
            options.height ??
            200,

        rotation:
            options.rotation ??
            0,

        opacity:
            options.opacity ??
            1,

        start:
            options.start ??
            0,

        duration:
            options.duration ??
            state.project.duration,

        text:
            options.text ??
            "Nowy tekst",

        fontSize:
            options.fontSize ??
            64,

        fontFamily:
            options.fontFamily ??
            "Arial",

        fontWeight:
            options.fontWeight ??
            700,

        color:
            options.color ??
            "#ffffff",

        src:
            options.src ??
            null,

        objectFit:
            options.objectFit ??
            "contain"
    };

    return element;
}


/* =========================================================
   ADD ELEMENT
========================================================= */

function addElement(type, options = {}) {

    saveHistory();

    const element =
        createElement(
            type,
            options
        );

    state.elements.push(element);

    state.selectedId =
        element.id;

    renderAll();

    return element;
}


/* =========================================================
   CANVAS RENDER
========================================================= */

function renderCanvas() {

    if (!DOM.canvas) {
        return;
    }

    const fragment =
        document.createDocumentFragment();


    for (const element of state.elements) {

        const node =
            document.createElement("div");

        node.className =
            "adgvmaker-element";

        node.dataset.id =
            element.id;

        node.style.left =
            `${element.x}px`;

        node.style.top =
            `${element.y}px`;

        node.style.width =
            `${element.width}px`;

        node.style.height =
            `${element.height}px`;

        node.style.opacity =
            element.opacity;

        node.style.transform =
            `rotate(${element.rotation}deg)`;


        if (
            element.id ===
            state.selectedId
        ) {

            node.style.outline =
                "2px solid #4da3ff";

            node.style.outlineOffset =
                "2px";
        }


        /* TEXT */

        if (element.type === "text") {

            node.textContent =
                element.text;

            node.style.display =
                "flex";

            node.style.alignItems =
                "center";

            node.style.justifyContent =
                "center";

            node.style.textAlign =
                "center";

            node.style.color =
                element.color;

            node.style.fontSize =
                `${element.fontSize}px`;

            node.style.fontFamily =
                element.fontFamily;

            node.style.fontWeight =
                element.fontWeight;

            node.style.userSelect =
                "none";
        }


        /* IMAGE / LOGO */

        else if (
            element.type === "image" ||
            element.type === "logo"
        ) {

            const image =
                document.createElement("img");

            image.src =
                element.src;

            image.alt =
                element.name;

            image.draggable =
                false;

            image.decoding =
                "async";

            image.style.width =
                "100%";

            image.style.height =
                "100%";

            image.style.objectFit =
                element.objectFit;

            image.style.pointerEvents =
                "none";

            node.appendChild(image);
        }


        /* VIDEO */

        else if (
            element.type === "video"
        ) {

            const video =
                document.createElement("video");

            video.src =
                element.src;

            video.muted =
                true;

            video.playsInline =
                true;

            video.preload =
                "metadata";

            video.style.width =
                "100%";

            video.style.height =
                "100%";

            video.style.objectFit =
                element.objectFit;

            video.style.pointerEvents =
                "none";

            node.appendChild(video);
        }


        node.addEventListener(
            "pointerdown",
            onElementPointerDown,
            {
                passive: false
            }
        );


        fragment.appendChild(node);
    }


    const old =
        DOM.canvas.querySelectorAll(
            ".adgvmaker-element"
        );

    old.forEach(
        node => node.remove()
    );


    DOM.canvas.appendChild(
        fragment
    );


    updatePlaceholder();
}


/* =========================================================
   PLACEHOLDER
========================================================= */

function updatePlaceholder() {

    if (!DOM.placeholder) {
        return;
    }

    DOM.placeholder.style.display =
        state.elements.length
            ? "none"
            : "flex";
}


/* =========================================================
   POINTER / TOUCH DRAG
========================================================= */

let drag = null;


function onElementPointerDown(event) {

    event.preventDefault();

    const id =
        event.currentTarget.dataset.id;

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    state.selectedId =
        id;

    const rect =
        DOM.canvas.getBoundingClientRect();


    /*
       Przeliczamy pozycję ekranu
       na współrzędne projektu.
    */

    const scaleX =
        state.project.format.width /
        rect.width;

    const scaleY =
        state.project.format.height /
        rect.height;


    drag = {

        id,

        pointerId:
            event.pointerId,

        offsetX:
            (
                event.clientX -
                rect.left
            ) *
            scaleX -
            element.x,

        offsetY:
            (
                event.clientY -
                rect.top
            ) *
            scaleY -
            element.y,

        scaleX,

        scaleY
    };


    event.currentTarget.setPointerCapture(
        event.pointerId
    );


    renderCanvas();

    renderProperties();


    event.currentTarget.addEventListener(
        "pointermove",
        onElementPointerMove
    );

    event.currentTarget.addEventListener(
        "pointerup",
        onElementPointerUp,
        {
            once: true
        }
    );
}


function onElementPointerMove(event) {

    if (!drag) {
        return;
    }

    if (
        event.pointerId !==
        drag.pointerId
    ) {
        return;
    }


    const element =
        getElement(drag.id);

    if (!element) {
        return;
    }


    const rect =
        DOM.canvas.getBoundingClientRect();


    let x =
        (
            event.clientX -
            rect.left
        ) *
        drag.scaleX -
        drag.offsetX;


    let y =
        (
            event.clientY -
            rect.top
        ) *
        drag.scaleY -
        drag.offsetY;


    x = clamp(
        x,
        0,
        state.project.format.width -
        element.width
    );


    y = clamp(
        y,
        0,
        state.project.format.height -
        element.height
    );


    element.x = x;
    element.y = y;


    /*
       Tylko canvas.
       Nie odświeżamy całego interfejsu
       przy każdym ruchu palca.
    */

    updateElementNode(
        element
    );
}


function onElementPointerUp(event) {

    if (!drag) {
        return;
    }


    saveHistory();

    drag = null;

    renderProperties();

    renderTimeline();
}


function updateElementNode(element) {

    const node =
        DOM.canvas.querySelector(
            `[data-id="${element.id}"]`
        );

    if (!node) {
        return;
    }

    node.style.left =
        `${element.x}px`;

    node.style.top =
        `${element.y}px`;
}


/* =========================================================
   SELECT
========================================================= */

function selectElement(id) {

    state.selectedId =
        id;

    renderCanvas();

    renderProperties();
}


/* =========================================================
   PROPERTIES
========================================================= */

function renderProperties() {

    const element =
        getSelected();


    if (!element) {

        DOM.properties.innerHTML = `
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


    DOM.properties.innerHTML = `

        <div class="property-group">
            <label>Nazwa</label>

            <input
                id="propName"
                type="text"
                value="${escapeHTML(element.name)}"
            >
        </div>


        <div class="property-group">
            <label>X</label>

            <input
                id="propX"
                type="number"
                value="${Math.round(element.x)}"
            >
        </div>


        <div class="property-group">
            <label>Y</label>

            <input
                id="propY"
                type="number"
                value="${Math.round(element.y)}"
            >
        </div>


        <div class="property-group">
            <label>Szerokość</label>

            <input
                id="propWidth"
                type="number"
                min="1"
                value="${Math.round(element.width)}"
            >
        </div>


        <div class="property-group">
            <label>Wysokość</label>

            <input
                id="propHeight"
                type="number"
                min="1"
                value="${Math.round(element.height)}"
            >
        </div>


        <div class="property-group">
            <label>Obrót</label>

            <input
                id="propRotation"
                type="number"
                value="${element.rotation}"
            >
        </div>


        <div class="property-group">
            <label>Przezroczystość</label>

            <input
                id="propOpacity"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value="${element.opacity}"
            >
        </div>


        ${
            element.type === "text"
                ? `

                <div class="property-group">
                    <label>Tekst</label>

                    <textarea
                        id="propText"
                        rows="4"
                    >${escapeHTML(element.text)}</textarea>
                </div>


                <div class="property-group">
                    <label>Rozmiar tekstu</label>

                    <input
                        id="propFontSize"
                        type="number"
                        min="1"
                        value="${element.fontSize}"
                    >
                </div>


                <div class="property-group">
                    <label>Kolor</label>

                    <input
                        id="propColor"
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


    connectProperties(element);
}


/* =========================================================
   PROPERTY EVENTS
========================================================= */

function connectProperties(element) {

    const input =
        id => document.getElementById(id);


    const update =
        (id, callback) => {

            const field =
                input(id);

            if (!field) {
                return;
            }

            field.addEventListener(
                "input",
                callback
            );
        };


    update(
        "propName",
        event => {
            element.name =
                event.target.value;

            renderTimeline();
        }
    );


    update(
        "propX",
        event => {

            element.x =
                Number(event.target.value) || 0;

            updateElementNode(element);
        }
    );


    update(
        "propY",
        event => {

            element.y =
                Number(event.target.value) || 0;

            updateElementNode(element);
        }
    );


    update(
        "propWidth",
        event => {

            element.width =
                Math.max(
                    1,
                    Number(event.target.value) || 1
                );

            renderCanvas();
        }
    );


    update(
        "propHeight",
        event => {

            element.height =
                Math.max(
                    1,
                    Number(event.target.value) || 1
                );

            renderCanvas();
        }
    );


    update(
        "propRotation",
        event => {

            element.rotation =
                Number(event.target.value) || 0;

            renderCanvas();
        }
    );


    update(
        "propOpacity",
        event => {

            element.opacity =
                Number(event.target.value);

            renderCanvas();
        }
    );


    update(
        "propText",
        event => {

            element.text =
                event.target.value;

            const node =
                DOM.canvas.querySelector(
                    `[data-id="${element.id}"]`
                );

            if (node) {
                node.textContent =
                    element.text;
            }
        }
    );


    update(
        "propFontSize",
        event => {

            element.fontSize =
                Math.max(
                    1,
                    Number(event.target.value) || 1
                );

            const node =
                DOM.canvas.querySelector(
                    `[data-id="${element.id}"]`
                );

            if (node) {
                node.style.fontSize =
                    `${element.fontSize}px`;
            }
        }
    );


    update(
        "propColor",
        event => {

            element.color =
                event.target.value;

            const node =
                DOM.canvas.querySelector(
                    `[data-id="${element.id}"]`
                );

            if (node) {
                node.style.color =
                    element.color;
            }
        }
    );


    const deleteButton =
        document.getElementById(
            "deleteElementBtn"
        );


    if (deleteButton) {

        deleteButton.onclick =
            deleteSelected;
    }
}


/* =========================================================
   DELETE
========================================================= */

function deleteSelected() {

    if (!state.selectedId) {
        return;
    }

    saveHistory();

    state.elements =
        state.elements.filter(
            element =>
                element.id !==
                state.selectedId
        );

    state.selectedId =
        null;

    renderAll();
}


/* =========================================================
   TEXT
========================================================= */

document
    .getElementById("addTextBtn")
    ?.addEventListener(
        "click",
        () => {

            addElement(
                "text",
                {
                    name: "Tekst",
                    text: "PROMOCJA!",
                    x: 240,
                    y: 250,
                    width: 600,
                    height: 140,
                    fontSize: 80
                }
            );
        }
    );


/* =========================================================
   IMAGE
========================================================= */

document
    .getElementById("addImageBtn")
    ?.addEventListener(
        "click",
        () => {
            DOM.imageInput.click();
        }
    );


DOM.imageInput?.addEventListener(
    "change",
    event => {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        const url =
            URL.createObjectURL(file);

        addElement(
            "image",
            {
                name: file.name,
                src: url,
                x: 100,
                y: 200,
                width: 700,
                height: 500
            }
        );

        event.target.value = "";
    }
);


/* =========================================================
   VIDEO
========================================================= */

document
    .getElementById("addVideoBtn")
    ?.addEventListener(
        "click",
        () => {
            DOM.videoInput.click();
        }
    );


DOM.videoInput?.addEventListener(
    "change",
    event => {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        const url =
            URL.createObjectURL(file);

        addElement(
            "video",
            {
                name: file.name,
                src: url,
                x: 0,
                y: 0,
                width:
                    state.project.format.width,
                height:
                    state.project.format.height
            }
        );

        event.target.value = "";
    }
);


/* =========================================================
   LOGO
========================================================= */

document
    .getElementById("addLogoBtn")
    ?.addEventListener(
        "click",
        () => {
            DOM.logoInput.click();
        }
    );


DOM.logoInput?.addEventListener(
    "change",
    event => {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        const url =
            URL.createObjectURL(file);

        addElement(
            "logo",
            {
                name: "Logo",
                src: url,
                x: 60,
                y: 60,
                width: 250,
                height: 130
            }
        );

        event.target.value = "";
    }
);


/* =========================================================
   ICON
========================================================= */

document
    .getElementById("addIconBtn")
    ?.addEventListener(
        "click",
        () => {

            addElement(
                "text",
                {
                    name: "Ikona",
                    text: "★",
                    x: 400,
                    y: 400,
                    width: 150,
                    height: 150,
                    fontSize: 110
                }
            );
        }
    );


/* =========================================================
   FORMAT
========================================================= */

DOM.formatSelect?.addEventListener(
    "change",
    event => {

        const format =
            CONFIG.formats[
                event.target.value
            ];

        if (!format) {
            return;
        }

        saveHistory();

        state.project.format = {
            width: format.width,
            height: format.height,
            ratio: format.ratio
        };

        DOM.canvas.dataset.width =
            format.width;

        DOM.canvas.dataset.height =
            format.height;

        DOM.canvas.style.aspectRatio =
            `${format.width} / ${format.height}`;

        renderCanvas();
    }
);


/* =========================================================
   NEW PROJECT
========================================================= */

document
    .getElementById("newProjectBtn")
    ?.addEventListener(
        "click",
        () => {

            if (
                state.elements.length > 0 &&
                !confirm(
                    "Utworzyć nowy projekt?"
                )
            ) {
                return;
            }

            state.elements = [];

            state.selectedId = null;

            state.playback.currentTime = 0;

            state.history.undo = [];

            state.history.redo = [];

            renderAll();
        }
    );


/* =========================================================
   SAVE PROJECT
========================================================= */

document
    .getElementById("saveProjectBtn")
    ?.addEventListener(
        "click",
        saveProject
    );


function saveProject() {

    const project = {
        format: "ADGV",
        version: CONFIG.version,
        type: "project",

        project: {
            ...state.project
        },

        elements:
            state.elements.map(
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
        "ADGVMaker-project.adgv";

    link.click();


    setTimeout(
        () => URL.revokeObjectURL(url),
        1000
    );
}


/* =========================================================
   PLAYBACK
========================================================= */

document
    .getElementById("playBtn")
    ?.addEventListener(
        "click",
        startPlayback
    );


document
    .getElementById("pauseBtn")
    ?.addEventListener(
        "click",
        pausePlayback
    );


document
    .getElementById("stopBtn")
    ?.addEventListener(
        "click",
        stopPlayback
    );


function startPlayback() {

    if (state.playback.playing) {
        return;
    }

    state.playback.playing = true;

    state.playback.lastFrame =
        performance.now();

    requestAnimationFrame(
        playbackLoop
    );
}


function pausePlayback() {

    state.playback.playing =
        false;
}


function stopPlayback() {

    state.playback.playing =
        false;

    state.playback.currentTime =
        0;

    updateTimeDisplay();
}


function playbackLoop(timestamp) {

    if (!state.playback.playing) {
        return;
    }


    const delta =
        (timestamp -
            state.playback.lastFrame) /
        1000;


    state.playback.lastFrame =
        timestamp;


    state.playback.currentTime +=
        delta;


    if (
        state.playback.currentTime >=
        state.project.duration
    ) {

        state.playback.currentTime =
            0;
    }


    updateTimeDisplay();


    requestAnimationFrame(
        playbackLoop
    );
}


/* =========================================================
   TIME DISPLAY
========================================================= */

function updateTimeDisplay() {

    if (DOM.currentTime) {

        DOM.currentTime.textContent =
            formatTime(
                state.playback.currentTime
            );
    }


    if (DOM.duration) {

        DOM.duration.textContent =
            formatTime(
                state.project.duration
            );
    }
}


/* =========================================================
   TIMELINE
========================================================= */

function renderTimeline() {

    const tracks = [
        DOM.mediaTrack,
        DOM.textTrack,
        DOM.graphicsTrack
    ];

    tracks.forEach(
        track => {
            if (track) {
                track.replaceChildren();
            }
        }
    );


    for (const element of state.elements) {

        let track;

        if (element.type === "text") {
            track = DOM.textTrack;
        }

        else if (
            element.type === "image" ||
            element.type === "logo"
        ) {
            track = DOM.graphicsTrack;
        }

        else {
            track = DOM.mediaTrack;
        }


        if (!track) {
            continue;
        }


        const item =
            document.createElement("div");

        item.className =
            "timeline-item";

        item.dataset.id =
            element.id;

        item.textContent =
            element.name;


        item.style.left =
            `${(
                element.start /
                state.project.duration
            ) * 100}%`;


        item.style.width =
            `${(
                element.duration /
                state.project.duration
            ) * 100}%`;


        if (
            element.id ===
            state.selectedId
        ) {
            item.style.outline =
                "2px solid #ffffff";
        }


        item.addEventListener(
            "click",
            () => {
                selectElement(
                    element.id
                );
            }
        );


        track.appendChild(item);
    }
}


/* =========================================================
   TEMPLATES
========================================================= */

const templates = {

    sale: {
        name: "Promocja",

        elements: [

            {
                type: "text",
                name: "Nagłówek",
                text: "PROMOCJA!",
                x: 150,
                y: 250,
                width: 780,
                height: 150,
                fontSize: 100
            },

            {
                type: "text",
                name: "Rabat",
                text: "-30%",
                x: 200,
                y: 500,
                width: 680,
                height: 200,
                fontSize: 160
            },

            {
                type: "text",
                name: "CTA",
                text: "KUP TERAZ",
                x: 250,
                y: 850,
                width: 580,
                height: 120,
                fontSize: 60
            }
        ]
    },


    product: {
        name: "Produkt",

        elements: [

            {
                type: "text",
                name: "Tytuł",
                text: "NOWY PRODUKT",
                x: 150,
                y: 200,
                width: 780,
                height: 150,
                fontSize: 80
            },

            {
                type: "text",
                name: "Opis",
                text: "Poznaj nową jakość",
                x: 200,
                y: 400,
                width: 680,
                height: 100,
                fontSize: 45
            }
        ]
    },


    gaming: {
        name: "Gaming",

        elements: [

            {
                type: "text",
                name: "Gaming",
                text: "GAME ON!",
                x: 100,
                y: 500,
                width: 880,
                height: 200,
                fontSize: 120
            },

            {
                type: "text",
                name: "CTA",
                text: "PLAY NOW",
                x: 250,
                y: 850,
                width: 580,
                height: 120,
                fontSize: 60
            }
        ]
    },


    business: {
        name: "Firma",

        elements: [

            {
                type: "text",
                name: "Firma",
                text: "TWOJA FIRMA",
                x: 150,
                y: 300,
                width: 780,
                height: 150,
                fontSize: 80
            },

            {
                type: "text",
                name: "Slogan",
                text: "Profesjonalne rozwiązania",
                x: 150,
                y: 520,
                width: 780,
                height: 120,
                fontSize: 42
            }
        ]
    }
};


document
    .querySelectorAll(".template-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const name =
                    button.dataset.template;

                loadTemplate(name);
            }
        );
    });


function loadTemplate(name) {

    const template =
        templates[name];

    if (!template) {
        return;
    }


    saveHistory();


    state.elements =
        template.elements.map(
            data =>
                createElement(
                    data.type,
                    data
                )
        );


    state.selectedId =
        state.elements[0]?.id ||
        null;


    renderAll();
}


/* =========================================================
   UNDO / REDO
========================================================= */

document
    .getElementById("undoBtn")
    ?.addEventListener(
        "click",
        undo
    );


document
    .getElementById("redoBtn")
    ?.addEventListener(
        "click",
        redo
    );


/* =========================================================
   DELETE KEY
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        const active =
            document.activeElement;


        const editing =
            active &&
            (
                active.tagName === "INPUT" ||
                active.tagName === "TEXTAREA" ||
                active.tagName === "SELECT"
            );


        if (
            !editing &&
            (
                event.key === "Delete" ||
                event.key === "Backspace"
            )
        ) {

            deleteSelected();
        }


        if (
            !editing &&
            event.ctrlKey &&
            event.key.toLowerCase() === "z"
        ) {

            event.preventDefault();

            undo();
        }


        if (
            !editing &&
            event.ctrlKey &&
            event.key.toLowerCase() === "y"
        ) {

            event.preventDefault();

            redo();
        }
    }
);


/* =========================================================
   CANVAS DESELECT
========================================================= */

DOM.canvas?.addEventListener(
    "pointerdown",
    event => {

        if (
            event.target ===
            DOM.canvas ||
            event.target ===
            DOM.placeholder
        ) {

            state.selectedId =
                null;

            renderCanvas();

            renderProperties();
        }
    }
);


/* =========================================================
   EXPORT PLACEHOLDER
========================================================= */

document
    .getElementById("exportBtn")
    ?.addEventListener(
        "click",
        () => {

            alert(
                "Eksport MP4 zostanie podłączony przez FFmpeg.wasm."
            );
        }
    );


/* =========================================================
   GLOBAL RENDER
========================================================= */

function renderAll() {

    renderCanvas();

    renderTimeline();

    renderProperties();

    updateTimeDisplay();
}


/* =========================================================
   INITIALIZATION
========================================================= */

function initialize() {

    const format =
        state.project.format;


    if (DOM.canvas) {

        DOM.canvas.dataset.width =
            format.width;

        DOM.canvas.dataset.height =
            format.height;

        DOM.canvas.style.aspectRatio =
            `${format.width} / ${format.height}`;
    }


    if (DOM.formatSelect) {

        DOM.formatSelect.value =
            `${format.width}x${format.height}`;
    }


    renderAll();


    console.log(
        "🎬 ADGVMaker initialized — Tech Karol"
    );
}


initialize();q
