// ============================================
// ADGVMaker
// Web Video Editor
// app.js
// ============================================

"use strict";

// ============================================
// STATE
// ============================================

const state = {
    media: [],
    selectedMedia: null,

    history: [],
    future: [],

    isPlaying: false
};


// ============================================
// DOM
// ============================================

const fileInput = document.getElementById("fileInput");
const importBtn = document.getElementById("importBtn");

const mediaLibrary = document.getElementById("mediaLibrary");
const emptyMedia = document.getElementById("emptyMedia");

const videoPreview = document.getElementById("videoPreview");
const previewPlaceholder =
    document.getElementById("previewPlaceholder");

const playBtn = document.getElementById("playBtn");

const seekBar = document.getElementById("seekBar");

const currentTime =
    document.getElementById("currentTime");

const duration =
    document.getElementById("duration");

const videoTrack =
    document.getElementById("videoTrack");

const audioTrack =
    document.getElementById("audioTrack");

const textTrack =
    document.getElementById("textTrack");

const propertiesContent =
    document.getElementById("propertiesContent");

const deleteBtn =
    document.getElementById("deleteBtn");

const splitBtn =
    document.getElementById("splitBtn");

const undoBtn =
    document.getElementById("undoBtn");

const redoBtn =
    document.getElementById("redoBtn");

const exportBtn =
    document.getElementById("exportBtn");


// ============================================
// INITIALIZATION
// ============================================

function init() {
    setupImport();
    setupPlayer();
    setupTimeline();
    setupKeyboardShortcuts();
    setupDragAndDrop();
    setupTools();
    setupButtons();

    renderMedia();
    renderProperties();

    console.log("ADGVMaker initialized");
}

init();


// ============================================
// IMPORT
// ============================================

function setupImport() {

    importBtn.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", event => {

        const files = [...event.target.files];

        files.forEach(file => {
            addMedia(file);
        });

        fileInput.value = "";
    });
}


function addMedia(file) {

    if (!isSupportedMedia(file)) {
        console.warn(
            "Unsupported file:",
            file.name
        );

        return;
    }

    const url =
        URL.createObjectURL(file);

    const media = {
        id: createId(),

        file,

        url,

        name: file.name,

        type: file.type,

        duration: 0,

        width: 0,

        height: 0,

        start: 0,

        end: 0
    };

    state.media.push(media);

    saveHistory();

    renderMedia();

    if (file.type.startsWith("video/")) {
        loadVideo(media);
    }
}


// ============================================
// MEDIA LIBRARY
// ============================================

function renderMedia() {

    mediaLibrary.innerHTML = "";

    if (state.media.length === 0) {

        mediaLibrary.appendChild(
            emptyMedia
        );

        return;
    }

    state.media.forEach(media => {

        const element =
            document.createElement("div");

        element.className =
            "media-item";

        element.dataset.id =
            media.id;

        const thumbnail =
            createThumbnail(media);

        element.appendChild(thumbnail);

        const info =
            document.createElement("div");

        info.className =
            "media-info";

        const name =
            document.createElement("div");

        name.className =
            "media-name";

        name.textContent =
            media.name;

        const type =
            document.createElement("div");

        type.className =
            "media-type";

        type.textContent =
            getMediaType(media.type);

        info.appendChild(name);
        info.appendChild(type);

        element.appendChild(info);

        element.addEventListener(
            "click",
            () => {

                selectMedia(media);

            }
        );

        mediaLibrary.appendChild(element);
    });
}


function createThumbnail(media) {

    if (media.type.startsWith("video/")) {

        const video =
            document.createElement("video");

        video.className =
            "media-thumb";

        video.src =
            media.url;

        video.muted = true;

        video.preload =
            "metadata";

        return video;
    }

    if (media.type.startsWith("image/")) {

        const img =
            document.createElement("img");

        img.className =
            "media-thumb";

        img.src =
            media.url;

        img.alt =
            media.name;

        return img;
    }

    const audio =
        document.createElement("div");

    audio.className =
        "media-thumb";

    audio.textContent =
        "♫";

    audio.style.display =
        "grid";

    audio.style.placeItems =
        "center";

    return audio;
}


// ============================================
// SELECT MEDIA
// ============================================

function selectMedia(media) {

    state.selectedMedia =
        media;

    if (media.type.startsWith("video/")) {
        loadVideo(media);
    }

    if (media.type.startsWith("audio/")) {
        loadAudio(media);
    }

    renderProperties();
    renderTimelineSelection();
}


// ============================================
// VIDEO
// ============================================

function loadVideo(media) {

    state.selectedMedia =
        media;

    videoPreview.src =
        media.url;

    videoPreview.style.display =
        "block";

    previewPlaceholder.style.display =
        "none";

    videoPreview.load();

    videoPreview.addEventListener(
        "loadedmetadata",
        () => {

            media.duration =
                videoPreview.duration;

            media.end =
                videoPreview.duration;

            media.width =
                videoPreview.videoWidth;

            media.height =
                videoPreview.videoHeight;

            seekBar.min =
                0;

            seekBar.max =
                videoPreview.duration;

            seekBar.value =
                0;

            duration.textContent =
                formatTime(
                    videoPreview.duration
                );

            renderProperties();

            addVideoToTimeline(media);

        },
        {
            once: true
        }
    );
}


// ============================================
// AUDIO
// ============================================

function loadAudio(media) {

    const audio =
        document.createElement("audio");

    audio.src =
        media.url;

    audio.preload =
        "metadata";

    audio.addEventListener(
        "loadedmetadata",
        () => {

            media.duration =
                audio.duration;

            media.end =
                audio.duration;

            addAudioToTimeline(media);

            renderProperties();

        },
        {
            once: true
        }
    );

    audio.load();
}


// ============================================
// PLAYER
// ============================================

function setupPlayer() {

    playBtn.addEventListener(
        "click",
        togglePlay
    );

    seekBar.addEventListener(
        "input",
        () => {

            if (!videoPreview.src) {
                return;
            }

            videoPreview.currentTime =
                Number(
                    seekBar.value
                );
        }
    );

    videoPreview.addEventListener(
        "timeupdate",
        updatePlayerUI
    );

    videoPreview.addEventListener(
        "play",
        () => {

            state.isPlaying =
                true;

            playBtn.textContent =
                "❚❚";
        }
    );

    videoPreview.addEventListener(
        "pause",
        () => {

            state.isPlaying =
                false;

            playBtn.textContent =
                "▶";
        }
    );

    videoPreview.addEventListener(
        "ended",
        () => {

            state.isPlaying =
                false;

            playBtn.textContent =
                "▶";
        }
    );
}


function togglePlay() {

    if (!videoPreview.src) {
        return;
    }

    if (videoPreview.paused) {

        videoPreview.play()
            .catch(error => {
                console.error(
                    "Playback error:",
                    error
                );
            });

    } else {

        videoPreview.pause();
    }
}


function updatePlayerUI() {

    if (!videoPreview.duration) {
        return;
    }

    seekBar.value =
        videoPreview.currentTime;

    currentTime.textContent =
        formatTime(
            videoPreview.currentTime
        );
}


// ============================================
// TIMELINE
// ============================================

function setupTimeline() {

    splitBtn.addEventListener(
        "click",
        splitSelectedClip
    );

    deleteBtn.addEventListener(
        "click",
        deleteSelectedMedia
    );
}


function addVideoToTimeline(media) {

    const existing =
        videoTrack.querySelector(
            `[data-id="${media.id}"]`
        );

    if (existing) {

        renderTimelineSelection();

        return;
    }

    const clip =
        createTimelineClip(media);

    videoTrack.appendChild(
        clip
    );

    renderTimelineSelection();
}


function addAudioToTimeline(media) {

    const existing =
        audioTrack.querySelector(
            `[data-id="${media.id}"]`
        );

    if (existing) {
        return;
    }

    const clip =
        createTimelineClip(media);

    audioTrack.appendChild(
        clip
    );
}


function createTimelineClip(media) {

    const clip =
        document.createElement("div");

    clip.className =
        "timeline-clip";

    clip.dataset.id =
        media.id;

    clip.textContent =
        media.name;

    const durationSeconds =
        media.duration || 10;

    const pixelsPerSecond =
        35;

    const width =
        Math.max(
            100,
            durationSeconds *
            pixelsPerSecond
        );

    clip.style.width =
        `${width}px`;

    clip.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            selectMedia(media);
        }
    );

    return clip;
}


function renderTimelineSelection() {

    document
        .querySelectorAll(".timeline-clip")
        .forEach(clip => {

            const selected =
                state.selectedMedia &&
                clip.dataset.id ===
                state.selectedMedia.id;

            clip.classList.toggle(
                "selected",
                selected
            );
        });
}


// ============================================
// SPLIT
// ============================================

function splitSelectedClip() {

    const media =
        state.selectedMedia;

    if (!media) {
        return;
    }

    if (!videoPreview.src) {
        return;
    }

    const splitTime =
        videoPreview.currentTime;

    if (
        splitTime <= 0 ||
        splitTime >= media.duration
    ) {

        console.warn(
            "Cannot split at this position."
        );

        return;
    }

    console.log(
        "Split:",
        media.name,
        "at",
        splitTime
    );

    /*
        Real non-destructive video splitting
        will be implemented with the project
        timeline engine.

        For now we store the split position.
    */

    media.splitPoint =
        splitTime;

    renderProperties();
}


// ============================================
// DELETE
// ============================================

function deleteSelectedMedia() {

    const media =
        state.selectedMedia;

    if (!media) {
        return;
    }

    saveHistory();

    state.media =
        state.media.filter(
            item =>
                item.id !== media.id
        );

    removeTimelineClip(
        media.id
    );

    URL.revokeObjectURL(
        media.url
    );

    state.selectedMedia =
        null;

    resetPreview();

    renderMedia();
    renderProperties();
}


function removeTimelineClip(id) {

    document
        .querySelectorAll(
            `.timeline-clip[data-id="${id}"]`
        )
        .forEach(element => {

            element.remove();
        });
}


function resetPreview() {

    videoPreview.pause();

    videoPreview.removeAttribute(
        "src"
    );

    videoPreview.load();

    videoPreview.style.display =
        "none";

    previewPlaceholder.style.display =
        "flex";

    seekBar.value =
        0;

    seekBar.max =
        100;

    currentTime.textContent =
        "00:00";

    duration.textContent =
        "00:00";

    playBtn.textContent =
        "▶";
}


// ============================================
// PROPERTIES
// ============================================

function renderProperties() {

    const media =
        state.selectedMedia;

    if (!media) {

        propertiesContent.innerHTML = `
            <div class="no-selection">

                <div class="no-selection-icon">
                    ◇
                </div>

                <strong>
                    Nothing selected
                </strong>

                <span>
                    Select a clip to edit
                    its properties.
                </span>

            </div>
        `;

        return;
    }

    propertiesContent.innerHTML = "";

    createPropertySection(
        "Clip",
        media.name
    );

    createPropertySection(
        "Type",
        getMediaType(media.type)
    );

    createPropertySection(
        "Duration",
        formatTime(media.duration)
    );

    if (
        media.width &&
        media.height
    ) {

        createPropertySection(
            "Resolution",
            `${media.width} × ${media.height}`
        );
    }

    if (
        typeof media.splitPoint ===
        "number"
    ) {

        createPropertySection(
            "Split point",
            formatTime(
                media.splitPoint
            )
        );
    }
}


function createPropertySection(
    title,
    value
) {

    const section =
        document.createElement("div");

    section.className =
        "property-section";

    section.style.marginBottom =
        "18px";

    const titleElement =
        document.createElement("div");

    titleElement.className =
        "property-title";

    titleElement.textContent =
        title;

    titleElement.style.marginBottom =
        "6px";

    titleElement.style.color =
        "#858c9c";

    titleElement.style.fontSize =
        "10px";

    const valueElement =
        document.createElement("div");

    valueElement.className =
        "property-value";

    valueElement.textContent =
        value;

    valueElement.style.fontSize =
        "12px";

    section.appendChild(
        titleElement
    );

    section.appendChild(
        valueElement
    );

    propertiesContent.appendChild(
        section
    );
}


// ============================================
// DRAG & DROP
// ============================================

function setupDragAndDrop() {

    mediaLibrary.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            mediaLibrary.style.outline =
                "2px dashed #7c5cff";
        }
    );

    mediaLibrary.addEventListener(
        "dragleave",
        () => {

            mediaLibrary.style.outline =
                "";
        }
    );

    mediaLibrary.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            mediaLibrary.style.outline =
                "";

            const files =
                [...event.dataTransfer.files];

            files.forEach(file => {

                if (
                    isSupportedMedia(file)
                ) {

                    addMedia(file);
                }
            });
        }
    );
}


// ============================================
// TOOLS
// ============================================

function setupTools() {

    document
        .querySelectorAll(".tool")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".tool"
                        )
                        .forEach(tool => {

                            tool.classList.remove(
                                "active"
                            );
                        });

                    button.classList.add(
                        "active"
                    );

                    const panel =
                        button.dataset.panel;

                    console.log(
                        "Panel:",
                        panel
                    );
                }
            );
        });
}


// ============================================
// BUTTONS
// ============================================

function setupButtons() {

    undoBtn.addEventListener(
        "click",
        undo
    );

    redoBtn.addEventListener(
        "click",
        redo
    );

    exportBtn.addEventListener(
        "click",
        exportProject
    );
}


// ============================================
// HISTORY
// ============================================

function saveHistory() {

    const snapshot =
        state.media.map(media => ({
            id: media.id,
            name: media.name,
            type: media.type,
            duration: media.duration,
            start: media.start,
            end: media.end
        }));

    state.history.push(
        JSON.stringify(snapshot)
    );

    state.future = [];

    if (
        state.history.length >
        50
    ) {

        state.history.shift();
    }
}


function undo() {

    if (
        state.history.length === 0
    ) {

        return;
    }

    const snapshot =
        state.history.pop();

    state.future.push(
        JSON.stringify(
            state.media.map(media => ({
                id: media.id,
                name: media.name,
                type: media.type,
                duration: media.duration,
                start: media.start,
                end: media.end
            }))
        )
    );

    console.log(
        "Undo snapshot:",
        snapshot
    );
}


function redo() {

    if (
        state.future.length === 0
    ) {

        return;
    }

    const snapshot =
        state.future.pop();

    state.history.push(
        snapshot
    );

    console.log(
        "Redo snapshot:",
        snapshot
    );
}


// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function setupKeyboardShortcuts() {

    document.addEventListener(
        "keydown",
        event => {

            // Space = Play / Pause
            if (
                event.code ===
                "Space"
            ) {

                const tag =
                    document.activeElement.tagName;

                if (
                    tag !== "INPUT" &&
                    tag !== "TEXTAREA"
                ) {

                    event.preventDefault();

                    togglePlay();
                }
            }


            // Delete
            if (
                event.key ===
                "Delete"
            ) {

                deleteSelectedMedia();
            }


            // Ctrl + Z
            if (
                event.ctrlKey &&
                event.key.toLowerCase() ===
                "z"
            ) {

                event.preventDefault();

                undo();
            }


            // Ctrl + Shift + Z
            if (
                event.ctrlKey &&
                event.shiftKey &&
                event.key.toLowerCase() ===
                "z"
            ) {

                event.preventDefault();

                redo();
            }
        }
    );
}


// ============================================
// EXPORT
// ============================================

function exportProject() {

    if (
        state.media.length === 0
    ) {

        alert(
            "Najpierw dodaj media do projektu."
        );

        return;
    }

    alert(
        "Eksport ADGVMaker zostanie podłączony do silnika FFmpeg/WebCodecs."
    );
}


// ============================================
// HELPERS
// ============================================

function createId() {

    if (
        window.crypto &&
        crypto.randomUUID
    ) {

        return crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2)
    );
}


function isSupportedMedia(file) {

    return (
        file.type.startsWith("video/") ||
        file.type.startsWith("audio/") ||
        file.type.startsWith("image/")
    );
}


function getMediaType(type) {

    if (
        type.startsWith("video/")
    ) {

        return "VIDEO";
    }

    if (
        type.startsWith("audio/")
    ) {

        return "AUDIO";
    }

    if (
        type.startsWith("image/")
    ) {

        return "IMAGE";
    }

    return "FILE";
}


function formatTime(seconds) {

    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {

        return "00:00";
    }

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        Math.floor(
            seconds % 60
        );

    if (hours > 0) {

        return (
            String(hours).padStart(2, "0") +
            ":" +
            String(minutes).padStart(2, "0") +
            ":" +
            String(secs).padStart(2, "0")
        );
    }

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
}
