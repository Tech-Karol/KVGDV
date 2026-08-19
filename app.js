/* =========================================================
   ADGVMaker v2 Mobile
   by Tech Karol

   Mobile-first editor engine
   - Touch / Pointer Events
   - Pinch zoom
   - Two-finger rotation
   - Dragging
   - Autosave
   - Undo / Redo
   - ADGV import / export
   - Templates
   - 10 second projects
========================================================= */

"use strict";


/* =========================================================
   CONFIG
========================================================= */

const CONFIG = Object.freeze({

    version: 2,

    autosaveKey:
        "adgvmaker_autosave_v2",

    autosaveDelay:
        700,

    historyLimit:
        40,

    defaultDuration:
        10,

    defaultFPS:
        30,

    formats: {

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

        "1920x1080": {
            width: 1920,
            height: 1080,
            ratio: "16:9"
        },

        "1280x720": {
            width: 1280,
            height: 720,
            ratio: "16:9"
        }
    }

});


/* =========================================================
   STATE
========================================================= */

const state = {

    project: {

        version:
            CONFIG.version,

        name:
            "Moja reklama",

        duration:
            CONFIG.defaultDuration,

        fps:
            CONFIG.defaultFPS,

        format:
            {
                width: 1080,
                height: 1920,
                ratio: "9:16"
            }
    },


    elements: [],


    selectedId:
        null,


    history: {

        undo: [],

        redo: []
    },


    playback: {

        playing: false,

        currentTime: 0,

        lastFrame: 0
    },


    interaction: {

        pointers:
            new Map(),

        mode:
            null,

        elementId:
            null,

        startX:
            0,

        startY:
            0,

        startElementX:
            0,

        startElementY:
            0,

        startWidth:
            0,

        startHeight:
            0,

        startRotation:
            0,

        startDistance:
            0,

        startAngle:
            0,

        centerX:
            0,

        centerY:
            0
    },


    view: {

        zoom:
            1
    }
};


/* =========================================================
   DOM CACHE
========================================================= */

const DOM = {

    canvas:
        document.getElementById("canvas"),

    placeholder:
        document.getElementById("canvasPlaceholder"),

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
        document.getElementById("duration"),

    playBtn:
        document.getElementById("playBtn"),

    pauseBtn:
        document.getElementById("pauseBtn"),

    stopBtn:
        document.getElementById("stopBtn")
};


/* =========================================================
   HELPERS
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

    return Math.max(
        min,
        Math.min(max, value)
    );
}


function round(value, decimals = 2) {

    const factor =
        10 ** decimals;

    return Math.round(
        value * factor
    ) / factor;
}


function formatTime(seconds) {

    seconds =
        Math.max(
            0,
            Number(seconds) || 0
        );

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(
            seconds % 60
        );

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
        element =>
            element.id === id
    );
}


function getSelected() {

    return getElement(
        state.selectedId
    );
}


/* =========================================================
   SNAPSHOT
========================================================= */

function createSnapshot() {

    return JSON.stringify({

        project:
            state.project,

        elements:
            state.elements

    });
}


function restoreSnapshot(snapshot) {

    if (!snapshot) {
        return;
    }

    try {

        const data =
            JSON.parse(snapshot);

        state.project =
            data.project;

        state.elements =
            data.elements || [];

        state.selectedId =
            null;

        state.playback.currentTime =
            0;

        renderAll();

        scheduleAutosave();

    } catch (error) {

        console.error(
            "ADGVMaker restore error:",
            error
        );
    }
}


function saveHistory() {

    state.history.undo.push(
        createSnapshot()
    );

    if (
        state.history.undo.length >
        CONFIG.historyLimit
    ) {

        state.history.undo.shift();
    }

    state.history.redo.length =
        0;
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

    restoreSnapshot(
        state.history.undo.pop()
    );
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

    restoreSnapshot(
        state.history.redo.pop()
    );
}


/* =========================================================
   ELEMENT FACTORY
========================================================= */

function createElement(
    type,
    options = {}
) {

    const format =
        state.project.format;


    const defaults = {

        text:
            "NOWY TEKST",

        fontSize:
            64,

        fontFamily:
            "Arial",

        fontWeight:
            700,

        color:
            "#ffffff",

        x:
            format.width / 2 - 200,

        y:
            format.height / 2 - 100,

        width:
            400,

        height:
            200,

        rotation:
            0,

        opacity:
            1,

        start:
            0,

        duration:
            state.project.duration,

        src:
            null,

        objectFit:
            "contain"
    };


    return {

        id:
            options.id ||
            uid(type),

        type,

        name:
            options.name ||
            type,

        x:
            Number(
                options.x ??
                defaults.x
            ),

        y:
            Number(
                options.y ??
                defaults.y
            ),

        width:
            Number(
                options.width ??
                defaults.width
            ),

        height:
            Number(
                options.height ??
                defaults.height
            ),

        rotation:
            Number(
                options.rotation ??
                defaults.rotation
            ),

        opacity:
            Number(
                options.opacity ??
                defaults.opacity
            ),

        start:
            Number(
                options.start ??
                defaults.start
            ),

        duration:
            Number(
                options.duration ??
                defaults.duration
            ),

        text:
            options.text ??
            defaults.text,

        fontSize:
            Number(
                options.fontSize ??
                defaults.fontSize
            ),

        fontFamily:
            options.fontFamily ??
            defaults.fontFamily,

        fontWeight:
            Number(
                options.fontWeight ??
                defaults.fontWeight
            ),

        color:
            options.color ??
            defaults.color,

        src:
            options.src ??
            defaults.src,

        objectFit:
            options.objectFit ??
            defaults.objectFit
    };
}


/* =========================================================
   ADD ELEMENT
========================================================= */

function addElement(
    type,
    options = {}
) {

    saveHistory();

    const element =
        createElement(
            type,
            options
        );

    state.elements.push(
        element
    );

    state.selectedId =
        element.id;

    renderAll();

    scheduleAutosave();

    return element;
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

    scheduleAutosave();
}


/* =========================================================
   CANVAS SCALE
========================================================= */

/*
    Projekt ma np. 1080x1920.

    Telefon może wyświetlić canvas np.
    360x640.

    scaleX = 360 / 1080
    scaleY = 640 / 1920

    Wszystkie ruchy palcem są przeliczane
    z pikseli ekranu na piksele projektu.
*/

function getCanvasMetrics() {

    const rect =
        DOM.canvas.getBoundingClientRect();

    return {

        rect,

        scaleX:
            state.project.format.width /
            rect.width,

        scaleY:
            state.project.format.height /
            rect.height
    };
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


    for (
        const element
        of state.elements
    ) {

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
                "2px solid #6366f1";

            node.style.outlineOffset =
                "3px";
        }


        /* TEXT */

        if (
            element.type === "text"
        ) {

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


            node.style.whiteSpace =
                "pre-wrap";
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


            node.appendChild(
                image
            );
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


            node.appendChild(
                video
            );
        }


        node.addEventListener(
            "pointerdown",
            onElementPointerDown,
            {
                passive: false
            }
        );


        fragment.appendChild(
            node
        );
    }


    DOM.canvas
        .querySelectorAll(
            ".adgvmaker-element"
        )
        .forEach(
            node => node.remove()
        );


    DOM.canvas.appendChild(
        fragment
    );


    updatePlaceholder();
}


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
   ELEMENT NODE UPDATE
========================================================= */

function updateElementNode(
    element
) {

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


    node.style.width =
        `${element.width}px`;


    node.style.height =
        `${element.height}px`;


    node.style.opacity =
        element.opacity;


    node.style.transform =
        `rotate(${element.rotation}deg)`;
}


/* =========================================================
   TOUCH HELPERS
========================================================= */

function getPointerList() {

    return [
        ...state.interaction.pointers.values()
    ];
}


function distanceBetween(
    a,
    b
) {

    return Math.hypot(
        b.x - a.x,
        b.y - a.y
    );
}


function angleBetween(
    a,
    b
) {

    return Math.atan2(
        b.y - a.y,
        b.x - a.x
    );
}


function midpoint(
    a,
    b
) {

    return {

        x:
            (a.x + b.x) / 2,

        y:
            (a.y + b.y) / 2
    };
}


/* =========================================================
   POINTER DOWN
========================================================= */

function onElementPointerDown(
    event
) {

    event.preventDefault();

    const node =
        event.currentTarget;

    const id =
        node.dataset.id;

    const element =
        getElement(id);


    if (!element) {
        return;
    }


    state.selectedId =
        id;


    node.setPointerCapture?.(
        event.pointerId
    );


    state.interaction.pointers.set(
        event.pointerId,
        {
            x: event.clientX,
            y: event.clientY
        }
    );


    const metrics =
        getCanvasMetrics();


    state.interaction.elementId =
        id;


    state.interaction.startX =
        event.clientX;


    state.interaction.startY =
        event.clientY;


    state.interaction.startElementX =
        element.x;


    state.interaction.startElementY =
        element.y;


    state.interaction.startWidth =
        element.width;


    state.interaction.startHeight =
        element.height;


    state.interaction.startRotation =
        element.rotation;


    /*
        Jeden palec = przesuwanie
    */

    state.interaction.mode =
        "drag";


    /*
        Dwa palce = zoom + obrót
    */

    if (
        state.interaction.pointers.size >= 2
    ) {

        const pointers =
            getPointerList();


        const a =
            pointers[0];

        const b =
            pointers[1];


        state.interaction.startDistance =
            distanceBetween(a, b);


        state.interaction.startAngle =
            angleBetween(a, b);


        state.interaction.mode =
            "transform";


        state.interaction.center =
            midpoint(a, b);
    }


    renderCanvas();

    renderProperties();
}


/* =========================================================
   POINTER MOVE
========================================================= */

function onPointerMove(
    event
) {

    if (
        !state.interaction.elementId
    ) {
        return;
    }


    if (
        !state.interaction.pointers.has(
            event.pointerId
        )
    ) {
        return;
    }


    event.preventDefault();


    state.interaction.pointers.set(
        event.pointerId,
        {
            x: event.clientX,
            y: event.clientY
        }
    );


    const element =
        getElement(
            state.interaction.elementId
        );


    if (!element) {
        return;
    }


    const metrics =
        getCanvasMetrics();


    /*
       ONE FINGER
    */

    if (
        state.interaction.mode ===
        "drag" &&
        state.interaction.pointers.size === 1
    ) {

        const dx =
            (
                event.clientX -
                state.interaction.startX
            ) *
            metrics.scaleX;


        const dy =
            (
                event.clientY -
                state.interaction.startY
            ) *
            metrics.scaleY;


        element.x =
            clamp(
                state.interaction.startElementX +
                dx,

                0,

                state.project.format.width -
                element.width
            );


        element.y =
            clamp(
                state.interaction.startElementY +
                dy,

                0,

                state.project.format.height -
                element.height
            );


        updateElementNode(
            element
        );


        return;
    }


    /*
       TWO FINGERS
    */

    if (
        state.interaction.pointers.size >= 2
    ) {

        const pointers =
            getPointerList();


        const a =
            pointers[0];

        const b =
            pointers[1];


        const distance =
            distanceBetween(
                a,
                b
            );


        const angle =
            angleBetween(
                a,
                b
            );


        if (
            state.interaction.startDistance <= 0
        ) {
            return;
        }


        /*
            Skalowanie
        */

        const scale =
            distance /
            state.interaction.startDistance;


        const newWidth =
            clamp(
                state.interaction.startWidth *
                scale,

                30,

                state.project.format.width
            );


        const newHeight =
            clamp(
                state.interaction.startHeight *
                scale,

                30,

                state.project.format.height
            );


        element.width =
            newWidth;


        element.height =
            newHeight;


        /*
            Obrót
        */

        const angleDelta =
            (
                angle -
                state.interaction.startAngle
            ) *
            180 /
            Math.PI;


        element.rotation =
            state.interaction.startRotation +
            angleDelta;


        /*
            Nie pozwalamy wyjechać
            całkowicie poza canvas.
        */

        element.x =
            clamp(
                element.x,
                0,
                state.project.format.width -
                element.width
            );


        element.y =
            clamp(
                element.y,
                0,
                state.project.format.height -
                element.height
            );


        updateElementNode(
            element
        );
    }
}


/* =========================================================
   POINTER UP
========================================================= */

function onPointerUp(
    event
) {

    if (
        state.interaction.pointers.has(
            event.pointerId
        )
    ) {

        state.interaction.pointers.delete(
            event.pointerId
        );
    }


    /*
       Po zakończeniu gestu zapisujemy
       jedną operację do historii.
    */

    if (
        state.interaction.pointers.size === 0
    ) {

        if (
            state.interaction.mode
        ) {

            saveHistoryFromInteraction();
        }


        state.interaction.mode =
            null;

        state.interaction.elementId =
            null;

        scheduleAutosave();

        renderProperties();

        renderTimeline();
    }


    /*
       Jeśli został jeden palec,
       wracamy do drag.
    */

    else if (
        state.interaction.pointers.size === 1
    ) {

        state.interaction.mode =
            "drag";
    }
}


function saveHistoryFromInteraction() {

    /*
       Historia gestu jest dodawana
       przed zmianą w przyszłej wersji.
       Tutaj zachowujemy prosty model:
       snapshot aktualnego stanu.
    */

    const current =
        createSnapshot();


    const previous =
        state.history.undo[
            state.history.undo.length - 1
        ];


    if (previous !== current) {

        state.history.undo.push(
            current
        );


        if (
            state.history.undo.length >
            CONFIG.historyLimit
        ) {

            state.history.undo.shift();
        }


        state.history.redo.length =
            0;
    }
}


/* =========================================================
   GLOBAL POINTER EVENTS
========================================================= */

document.addEventListener(
    "pointermove",
    onPointerMove,
    {
        passive: false
    }
);


document.addEventListener(
    "pointerup",
    onPointerUp,
    {
        passive: false
    }
);


document.addEventListener(
    "pointercancel",
    onPointerUp,
    {
        passive: false
    }
);


/* =========================================================
   SELECT / DESELECT
========================================================= */

function selectElement(id) {

    if (!getElement(id)) {
        return;
    }

    state.selectedId =
        id;

    renderCanvas();

    renderProperties();
}


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
   PROPERTIES
========================================================= */

function renderProperties() {

    const element =
        getSelected();


    if (!element) {

        DOM.properties.innerHTML = `

            <div class="no-selection">

                <div>
                    ⚙️
                </div>

                <p>
                    Wybierz element,
                    aby go edytować.
                </p>

            </div>

        `;

        return;
    }


    DOM.properties.innerHTML = `

        <div class="property-group">

            <label>
                Nazwa
            </label>

            <input
                id="propName"
                type="text"
                value="${escapeHTML(
                    element.name
                )}"
            >

        </div>


        <div class="property-group">

            <label>
                X
            </label>

            <input
                id="propX"
                type="number"
                value="${round(
                    element.x
                )}"
            >

        </div>


        <div class="property-group">

            <label>
                Y
            </label>

            <input
                id="propY"
                type="number"
                value="${round(
                    element.y
                )}"
            >

        </div>


        <div class="property-group">

            <label>
                Szerokość
            </label>

            <input
                id="propWidth"
                type="number"
                min="30"
                value="${round(
                    element.width
                )}"
            >

        </div>


        <div class="property-group">

            <label>
                Wysokość
            </label>

            <input
                id="propHeight"
                type="number"
                min="30"
                value="${round(
                    element.height
                )}"
            >

        </div>


        <div class="property-group">

            <label>
                Obrót
            </label>

            <input
                id="propRotation"
                type="number"
                value="${round(
                    element.rotation
                )}"
            >

        </div>


        <div class="property-group">

            <label>
                Przezroczystość
            </label>

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

                    <label>
                        Tekst
                    </label>

                    <textarea
                        id="propText"
                        rows="4"
                    >${escapeHTML(
                        element.text
                    )}</textarea>

                </div>


                <div class="property-group">

                    <label>
                        Rozmiar tekstu
                    </label>

                    <input
                        id="propFontSize"
                        type="number"
                        min="1"
                        value="${element.fontSize}"
                    >

                </div>


                <div class="property-group">

                    <label>
                        Kolor
                    </label>

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


    connectPropertyEvents(
        element
    );
}


/* =========================================================
   PROPERTY EVENTS
========================================================= */

function connectPropertyEvents(
    element
) {

    const bind =
        (
            id,
            callback
        ) => {

            const field =
                document.getElementById(
                    id
                );


            if (!field) {
                return;
            }


            field.addEventListener(
                "input",
                callback
            );
        };


    bind(
        "propName",
        event => {

            element.name =
                event.target.value;

            renderTimeline();

            scheduleAutosave();
        }
    );


    bind(
        "propX",
        event => {

            element.x =
                clamp(
                    Number(
                        event.target.value
                    ) || 0,

                    0,

                    state.project.format.width -
                    element.width
                );


            updateElementNode(
                element
            );

            scheduleAutosave();
        }
    );


    bind(
        "propY",
        event => {

            element.y =
                clamp(
                    Number(
                        event.target.value
                    ) || 0,

                    0,

                    state.project.format.height -
                    element.height
                );


            updateElementNode(
                element
            );

            scheduleAutosave();
        }
    );


    bind(
        "propWidth",
        event => {

            element.width =
                clamp(
                    Number(
                        event.target.value
                    ) || 30,

                    30,

                    state.project.format.width
                );


            updateElementNode(
                element
            );

            scheduleAutosave();
        }
    );


    bind(
        "propHeight",
        event => {

            element.height =
                clamp(
                    Number(
                        event.target.value
                    ) || 30,

                    30,

                    state.project.format.height
                );


            updateElementNode(
                element
            );

            scheduleAutosave();
        }
    );


    bind(
        "propRotation",
        event => {

            element.rotation =
                Number(
                    event.target.value
                ) || 0;


            updateElementNode(
                element
            );

            scheduleAutosave();
        }
    );


    bind(
        "propOpacity",
        event => {

            element.opacity =
                Number(
                    event.target.value
                );


            updateElementNode(
                element
            );

            scheduleAutosave();
        }
    );


    bind(
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


            scheduleAutosave();
        }
    );


    bind(
        "propFontSize",
        event => {

            element.fontSize =
                Math.max(
                    1,
                    Number(
                        event.target.value
                    ) || 1
                );


            const node =
                DOM.canvas.querySelector(
                    `[data-id="${element.id}"]`
                );


            if (node) {

                node.style.fontSize =
                    `${element.fontSize}px`;
            }


            scheduleAutosave();
        }
    );


    bind(
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


            scheduleAutosave();
        }
    );


    document
        .getElementById(
            "deleteElementBtn"
        )
        ?.addEventListener(
            "click",
            deleteSelected
        );
}


/* =========================================================
   FILE IMPORT
========================================================= */

function setupFileInputs() {

    DOM.imageInput?.addEventListener(
        "change",
        event => {

            const file =
                event.target.files?.[0];

            if (!file) {
                return;
            }


            const url =
                URL.createObjectURL(
                    file
                );


            addElement(
                "image",
                {

                    name:
                        file.name,

                    src:
                        url,

                    x:
                        100,

                    y:
                        200,

                    width:
                        700,

                    height:
                        500
                }
            );


            event.target.value =
                "";
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
                URL.createObjectURL(
                    file
                );


            addElement(
                "video",
                {

                    name:
                        file.name,

                    src:
                        url,

                    x:
                        0,

                    y:
                        0,

                    width:
                        state.project.format.width,

                    height:
                        state.project.format.height
                }
            );


            event.target.value =
                "";
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
                URL.createObjectURL(
                    file
                );


            addElement(
                "logo",
                {

                    name:
                        "Logo",

                    src:
                        url,

                    x:
                        60,

                    y:
                        60,

                    width:
                        250,

                    height:
                        130
                }
            );


            event.target.value =
                "";
        }
    );
}


/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {


    document
        .getElementById(
            "addTextBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                addElement(
                    "text",
                    {

                        name:
                            "Nagłówek",

                        text:
                            "PROMOCJA!",

                        x:
                            150,

                        y:
                            300,

                        width:
                            780,

                        height:
                            150,

                        fontSize:
                            90
                    }
                );
            }
        );


    document
        .getElementById(
            "addImageBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                DOM.imageInput?.click();
            }
        );


    document
        .getElementById(
            "addVideoBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                DOM.videoInput?.click();
            }
        );


    document
        .getElementById(
            "addLogoBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                DOM.logoInput?.click();
            }
        );


    document
        .getElementById(
            "addIconBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                addElement(
                    "text",
                    {

                        name:
                            "Ikona",

                        text:
                            "★",

                        x:
                            400,

                        y:
                            400,

                        width:
                            150,

                        height:
                            150,

                        fontSize:
                            110
                    }
                );
            }
        );


    document
        .getElementById(
            "undoBtn"
        )
        ?.addEventListener(
            "click",
            undo
        );


    document
        .getElementById(
            "redoBtn"
        )
        ?.addEventListener(
            "click",
            redo
        );


    document
        .getElementById(
            "newProjectBtn"
        )
        ?.addEventListener(
            "click",
            newProject
        );


    document
        .getElementById(
            "saveProjectBtn"
        )
        ?.addEventListener(
            "click",
            exportProject
        );


    document
        .getElementById(
            "exportBtn"
        )
        ?.addEventListener(
            "click",
            exportVideoPlaceholder
        );


    DOM.playBtn?.addEventListener(
        "click",
        startPlayback
    );


    DOM.pauseBtn?.addEventListener(
        "click",
        pausePlayback
    );


    DOM.stopBtn?.addEventListener(
        "click",
        stopPlayback
    );
}


/* =========================================================
   FORMAT
========================================================= */

function setupFormat() {

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

                width:
                    format.width,

                height:
                    format.height,

                ratio:
                    format.ratio
            };


            DOM.canvas.style.aspectRatio =
                `${format.width} / ${format.height}`;


            renderCanvas();

            renderProperties();

            scheduleAutosave();
        }
    );
}


/* =========================================================
   NEW PROJECT
========================================================= */

function newProject() {

    if (
        state.elements.length > 0
    ) {

        const accepted =
            confirm(
                "Utworzyć nowy projekt?"
            );


        if (!accepted) {
            return;
        }
    }


    state.elements =
        [];


    state.selectedId =
        null;


    state.history.undo =
        [];


    state.history.redo =
        [];


    state.playback.currentTime =
        0;


    state.project.name =
        "Moja reklama";


    renderAll();

    scheduleAutosave();
}


/* =========================================================
   ADGV EXPORT
========================================================= */

function exportProject() {

    const data = {

        format:
            "ADGV",

        version:
            CONFIG.version,

        project:
            state.project,

        elements:
            state.elements
    };


    const blob =
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );


    downloadBlob(
        blob,
        "ADGVMaker-project.adgv"
    );
}


function downloadBlob(
    blob,
    filename
) {

    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement("a");


    link.href =
        url;


    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );
}


/* =========================================================
   ADGV IMPORT
========================================================= */

function importProjectFile(
    file
) {

    const reader =
        new FileReader();


    reader.onload =
        () => {

            try {

                const data =
                    JSON.parse(
                        reader.result
                    );


                if (
                    data.format !==
                    "ADGV"
                ) {

                    throw new Error(
                        "Nieprawidłowy format ADGV."
                    );
                }


                saveHistory();


                state.project =
                    data.project;


                state.elements =
                    Array.isArray(
                        data.elements
                    )
                        ? data.elements
                        : [];


                state.selectedId =
                    null;


                state.playback.currentTime =
                    0;


                renderAll();

                scheduleAutosave();


            } catch (error) {

                console.error(
                    error
                );


                alert(
                    "Nie udało się otworzyć projektu."
                );
            }
        };


    reader.readAsText(
        file
    );
}


/* =========================================================
   AUTOSAVE
========================================================= */

let autosaveTimer =
    null;


function scheduleAutosave() {

    clearTimeout(
        autosaveTimer
    );


    autosaveTimer =
        setTimeout(
            autosave,
            CONFIG.autosaveDelay
        );
}


function autosave() {

    try {

        const data = {

            version:
                CONFIG.version,

            project:
                state.project,

            elements:
                state.elements
        };


        localStorage.setItem(
            CONFIG.autosaveKey,
            JSON.stringify(data)
        );


    } catch (error) {

        /*
           Safari / iOS może blokować
           localStorage w określonych
           warunkach.

           Edytor nadal działa.
        */

        console.warn(
            "Autosave unavailable:",
            error
        );
    }
}


/* =========================================================
   RESTORE AUTOSAVE
========================================================= */

function restoreAutosave() {

    try {

        const saved =
            localStorage.getItem(
                CONFIG.autosaveKey
            );


        if (!saved) {
            return false;
        }


        const data =
            JSON.parse(saved);


        if (
            !data.project ||
            !Array.isArray(
                data.elements
            )
        ) {

            return false;
        }


        state.project =
            data.project;


        state.elements =
            data.elements;


        return true;


    } catch (error) {

        console.warn(
            "Autosave restore failed:",
            error
        );


        return false;
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

            track?.replaceChildren();

        }
    );


    for (
        const element
        of state.elements
    ) {

        let track;


        if (
            element.type ===
            "text"
        ) {

            track =
                DOM.textTrack;

        } else if (

            element.type === "image" ||
            element.type === "logo"

        ) {

            track =
                DOM.graphicsTrack;

        } else {

            track =
                DOM.mediaTrack;
        }


        if (!track) {
            continue;
        }


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "timeline-item";


        item.dataset.id =
            element.id;


        item.textContent =
            element.name;


        const left =
            (
                element.start /
                state.project.duration
            ) *
            100;


        const width =
            (
                element.duration /
                state.project.duration
            ) *
            100;


        item.style.left =
            `${left}%`;


        item.style.width =
            `${Math.max(
                width,
                2
            )}%`;


        if (
            element.id ===
            state.selectedId
        ) {

            item.style.outline =
                "2px solid #fff";
        }


        item.addEventListener(
            "click",
            () => {

                selectElement(
                    element.id
                );
            }
        );


        track.appendChild(
            item
        );
    }
}


/* =========================================================
   TEMPLATES
========================================================= */

const templates = {

    sale: {

        name:
            "Promocja",

        elements: [

            {
                type:
                    "text",

                name:
                    "Nagłówek",

                text:
                    "PROMOCJA!",

                x:
                    100,

                y:
                    260,

                width:
                    880,

                height:
                    150,

                fontSize:
                    90
            },


            {
                type:
                    "text",

                name:
                    "Rabat",

                text:
                    "-30%",

                x:
                    150,

                y:
                    500,

                width:
                    780,

                height:
                    220,

                fontSize:
                    170
            },


            {
                type:
                    "text",

                name:
                    "CTA",

                text:
                    "KUP TERAZ",

                x:
                    200,

                y:
                    900,

                width:
                    680,

                height:
                    130,

                fontSize:
                    58
            }

        ]
    },


    product: {

        name:
            "Produkt",

        elements: [

            {
                type:
                    "text",

                name:
                    "Tytuł",

                text:
                    "NOWY PRODUKT",

                x:
                    100,

                y:
                    220,

                width:
                    880,

                height:
                    150,

                fontSize:
                    75
            },


            {
                type:
                    "text",

                name:
                    "Opis",

                text:
                    "Poznaj nową jakość.",

                x:
                    120,

                y:
                    430,

                width:
                    840,

                height:
                    120,

                fontSize:
                    42
            },


            {
                type:
                    "text",

                name:
                    "CTA",

                text:
                    "SPRAWDŹ TERAZ",

                x:
                    180,

                y:
                    900,

                width:
                    720,

                height:
                    130,

                fontSize:
                    52
            }

        ]
    },


    gaming: {

        name:
            "Gaming",

        elements: [

            {
                type:
                    "text",

                name:
                    "Gaming",

                text:
                    "GAME ON!",

                x:
                    80,

                y:
                    500,

                width:
                    920,

                height:
                    200,

                fontSize:
                    125
            },


            {
                type:
                    "text",

                name:
                    "CTA",

                text:
                    "PLAY NOW",

                x:
                    220,

                y:
                    900,

                width:
                    640,

                height:
                    140,

                fontSize:
                    65
            }

        ]
    },


    business: {

        name:
            "Firma",

        elements: [

            {
                type:
                    "text",

                name:
                    "Firma",

                text:
                    "TWOJA FIRMA",

                x:
                    100,

                y:
                    300,

                width:
                    880,

                height:
                    150,

                fontSize:
                    80
            },


            {
                type:
                    "text",

                name:
                    "Slogan",

                text:
                    "Profesjonalne rozwiązania.",

                x:
                    120,

                y:
                    520,

                width:
                    840,

                height:
                    130,

                fontSize:
                    42
            }

        ]
    }
};


function setupTemplates() {

    document
        .querySelectorAll(
            ".template-card"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        loadTemplate(
                            button.dataset.template
                        );
                    }
                );
            }
        );
}


function loadTemplate(
    name
) {

    const template =
        templates[name];


    if (!template) {
        return;
    }


    saveHistory();


    state.project.name =
        template.name;


    state.project.duration =
        CONFIG.defaultDuration;


    state.elements =
        template.elements.map(
            element =>
                createElement(
                    element.type,
                    element
                )
        );


    state.selectedId =
        state.elements[0]?.id ||
        null;


    state.playback.currentTime =
        0;


    renderAll();

    scheduleAutosave();
}


/* =========================================================
   PLAYBACK
========================================================= */

function startPlayback() {

    if (
        state.playback.playing
    ) {
        return;
    }


    state.playback.playing =
        true;


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


function playbackLoop(
    timestamp
) {

    if (
        !state.playback.playing
    ) {
        return;
    }


    const delta =
        (
            timestamp -
            state.playback.lastFrame
        ) /
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


    updatePlaybackVisibility();


    requestAnimationFrame(
        playbackLoop
    );
}


/* =========================================================
   PLAYBACK VISIBILITY
========================================================= */

function updatePlaybackVisibility() {

    const time =
        state.playback.currentTime;


    DOM.canvas
        .querySelectorAll(
            ".adgvmaker-element"
        )
        .forEach(
            node => {

                const element =
                    getElement(
                        node.dataset.id
                    );


                if (!element) {
                    return;
                }


                const visible =
                    time >= element.start &&
                    time <
                    element.start +
                    element.duration;


                node.style.visibility =
                    visible
                        ? "visible"
                        : "hidden";
            }
        );
}


/* =========================================================
   TIME
========================================================= */

function updateTimeDisplay() {

    if (
        DOM.currentTime
    ) {

        DOM.currentTime.textContent =
            formatTime(
                state.playback.currentTime
            );
    }


    if (
        DOM.duration
    ) {

        DOM.duration.textContent =
            formatTime(
                state.project.duration
            );
    }
}


/* =========================================================
   EXPORT VIDEO
========================================================= */

function exportVideoPlaceholder() {

    alert(
        "🎬 Eksport MP4 będzie realizowany przez moduł FFmpeg.wasm."
    );
}


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        const active =
            document.activeElement;


        const editing =
            active &&
            (
                active.tagName ===
                    "INPUT" ||

                active.tagName ===
                    "TEXTAREA" ||

                active.tagName ===
                    "SELECT"
            );


        if (
            !editing &&
            (
                event.key ===
                    "Delete" ||

                event.key ===
                    "Backspace"
            )
        ) {

            deleteSelected();
        }


        if (
            !editing &&
            event.ctrlKey &&
            event.key.toLowerCase() ===
                "z"
        ) {

            event.preventDefault();

            undo();
        }


        if (
            !editing &&
            event.ctrlKey &&
            event.key.toLowerCase() ===
                "y"
        ) {

            event.preventDefault();

            redo();
        }
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

    updatePlaybackVisibility();
}


/* =========================================================
   INITIALIZE CANVAS
========================================================= */

function initializeCanvas() {

    const format =
        state.project.format;


    DOM.canvas.style.aspectRatio =
        `${format.width} / ${format.height}`;


    if (
        DOM.formatSelect
    ) {

        DOM.formatSelect.value =
            `${format.width}x${format.height}`;
    }
}


/* =========================================================
   INITIALIZATION
========================================================= */

function initialize() {

    initializeCanvas();

    setupButtons();

    setupFileInputs();

    setupFormat();

    setupTemplates();


    const restored =
        restoreAutosave();


    renderAll();


    console.log(
        restored
            ? "🎬 ADGVMaker v2 Mobile — autosave restored"
            : "🎬 ADGVMaker v2 Mobile — Tech Karol"
    );
}


initialize();
