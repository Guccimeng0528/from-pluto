/* =========================================================
   NAMTANFILM ARCHIVE
   Vanilla JavaScript
   Author: Guccimeng
   ========================================================= */


const SAMPLE_EVENTS = [
    {
        id: "demo-001",
        date: "2026-09-15",
        title: "NamtanFilm Demo Event",
        artist: "NamtanFilm",
        type: "Event",
        location: "Bangkok, Thailand",
        description: "這是一筆示例資料，之後可以替換成真實活動。",
        image: "",
        link: ""
    },

    {
        id: "demo-002",
        date: "2026-09-20",
        title: "Namtan Live Demo",
        artist: "Namtan",
        type: "Live",
        location: "Online",
        description: "這是一筆示例直播資料。",
        image: "",
        link: ""
    },

    {
        id: "demo-003",
        date: "2026-09-25",
        title: "Film Event Demo",
        artist: "Film",
        type: "Event",
        location: "Bangkok, Thailand",
        description: "這是一筆示例活動資料。",
        image: "",
        link: ""
    },

    {
        id: "demo-004",
        date: "2026-10-03",
        title: "NamtanFilm Fan Meeting Demo",
        artist: "NamtanFilm",
        type: "Fan Meeting",
        location: "Bangkok, Thailand",
        description: "這是一筆示例 Fan Meeting 資料。",
        image: "",
        link: ""
    },

    {
        id: "demo-005",
        date: "2026-10-10",
        title: "NamtanFilm Concert Demo",
        artist: "NamtanFilm",
        type: "Concert",
        location: "Bangkok, Thailand",
        description: "這是一筆示例 Concert 資料。",
        image: "",
        link: ""
    },

    {
        id: "demo-006",
        date: "2026-10-18",
        title: "Film Interview Demo",
        artist: "Film",
        type: "Interview",
        location: "Online",
        description: "這是一筆示例 Interview 資料。",
        image: "",
        link: ""
    },

    {
        id: "demo-007",
        date: "2026-11-02",
        title: "Namtan Live Demo 02",
        artist: "Namtan",
        type: "Live",
        location: "Online",
        description: "示例直播資料。",
        image: "",
        link: ""
    },

    {
        id: "demo-008",
        date: "2026-11-15",
        title: "NamtanFilm Event Demo 02",
        artist: "NamtanFilm",
        type: "Event",
        location: "Bangkok, Thailand",
        description: "示例活動資料。",
        image: "",
        link: ""
    },

    {
        id: "demo-009",
        date: "2026-12-01",
        title: "NamtanFilm Fan Meeting Demo 02",
        artist: "NamtanFilm",
        type: "Fan Meeting",
        location: "Bangkok, Thailand",
        description: "示例 Fan Meeting 資料。",
        image: "",
        link: ""
    }
];


let events = [];

let filteredEvents = [];

let currentPage = 1;

const PAGE_SIZE = 9;


/* =========================================================
   DOM
   ========================================================= */

const eventsGrid =
    document.getElementById("eventsGrid");

const emptyState =
    document.getElementById("emptyState");

const searchInput =
    document.getElementById("searchInput");

const monthFilter =
    document.getElementById("monthFilter");

const dateFilter =
    document.getElementById("dateFilter");

const artistFilter =
    document.getElementById("artistFilter");

const typeFilter =
    document.getElementById("typeFilter");

const clearFilters =
    document.getElementById("clearFilters");

const emptyClear =
    document.getElementById("emptyClear");

const prevPage =
    document.getElementById("prevPage");

const nextPage =
    document.getElementById("nextPage");

const pageInfo =
    document.getElementById("pageInfo");


/* =========================================================
   MODAL
   ========================================================= */

const modal =
    document.getElementById("eventModal");

const modalClose =
    document.getElementById("modalClose");

const modalTitle =
    document.getElementById("modalTitle");

const modalArtist =
    document.getElementById("modalArtist");

const modalType =
    document.getElementById("modalType");

const modalDate =
    document.getElementById("modalDate");

const modalLocation =
    document.getElementById("modalLocation");

const modalDescription =
    document.getElementById("modalDescription");

const modalLink =
    document.getElementById("modalLink");

const modalImage =
    document.getElementById("modalImage");


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    await loadEvents();

    setupFilters();

    updateStats();

    applyFilters();

    setupEvents();

}


/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadEvents() {

    try {

        const response =
            await fetch(
                "./data/events.json",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {
            throw new Error(
                "Unable to load events.json"
            );
        }


        const data =
            await response.json();


        if (!Array.isArray(data)) {
            throw new Error(
                "events.json must contain an array"
            );
        }


        events = data;


    } catch (error) {

        console.warn(
            "events.json could not be loaded. Using demo data.",
            error
        );

        events =
            SAMPLE_EVENTS;

    }


    events =
        events
            .filter(event => event.date)
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


    filteredEvents =
        [...events];
}


/* =========================================================
   FILTER SETUP
   ========================================================= */

function setupFilters() {

    populateMonthFilter();

}


/* =========================================================
   MONTH FILTER
   ========================================================= */

function populateMonthFilter() {

    const months =
        [
            ...new Set(
                events.map(
                    event =>
                        event.date.substring(
                            0,
                            7
                        )
                )
            )
        ]
        .sort()
        .reverse();


    months.forEach(month => {

        const option =
            document.createElement("option");

        option.value = month;

        option.textContent =
            formatMonth(month);

        monthFilter.appendChild(
            option
        );

    });

}


/* =========================================================
   FILTER EVENTS
   ========================================================= */

function applyFilters() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    const month =
        monthFilter.value;

    const selectedDate =
        dateFilter.value;

    const artist =
        artistFilter.value;

    const type =
        typeFilter.value;


    filteredEvents =
        events.filter(event => {

            const searchableText = [
                event.title,
                event.artist,
                event.type,
                event.location,
                event.description
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                !search ||
                searchableText.includes(
                    search
                );


            const matchesMonth =
                !month ||
                event.date.startsWith(
                    month
                );


            const matchesDate =
                !selectedDate ||
                event.date === selectedDate;


            const matchesArtist =
                !artist ||
                event.artist === artist;


            const matchesType =
                !type ||
                event.type === type;


            return (
                matchesSearch &&
                matchesMonth &&
                matchesDate &&
                matchesArtist &&
                matchesType
            );

        });


    currentPage = 1;

    renderEvents();

}


/* =========================================================
   RENDER EVENTS
   ========================================================= */

function renderEvents() {

    eventsGrid.innerHTML = "";


    const total =
        filteredEvents.length;


    document.getElementById(
        "resultCount"
    ).textContent = total;


    if (total === 0) {

        emptyState.classList.remove(
            "hidden"
        );

        updatePagination();

        return;

    }


    emptyState.classList.add(
        "hidden"
    );


    const start =
        (currentPage - 1) *
        PAGE_SIZE;

    const end =
        start + PAGE_SIZE;


    const pageEvents =
        filteredEvents.slice(
            start,
            end
        );


    pageEvents.forEach(
        event => {

            const card =
                createEventCard(event);

            eventsGrid.appendChild(
                card
            );

        }
    );


    updatePagination();

}


/* =========================================================
   CREATE EVENT CARD
   ========================================================= */

function createEventCard(event) {

    const card =
        document.createElement("article");

    card.className =
        "event-card";


    const imageHTML =
        event.image
            ? `
                <img
                    src="${escapeHTML(event.image)}"
                    alt="${escapeHTML(event.title)}"
                    loading="lazy"
                >
              `
            : `
                <div class="event-image-placeholder">
                    NF
                </div>
              `;


    card.innerHTML = `

        <div class="event-image">

            ${imageHTML}

            <div class="event-date">
                ${formatShortDate(event.date)}
            </div>

        </div>


        <div class="event-body">

            <div class="event-tags">

                <span class="tag">
                    ${escapeHTML(event.artist || "N/A")}
                </span>

                <span class="tag">
                    ${escapeHTML(event.type || "Other")}
                </span>

            </div>


            <h3 class="event-title">
                ${escapeHTML(event.title || "Untitled Event")}
            </h3>


            <div class="event-location">
                📍 ${escapeHTML(event.location || "—")}
            </div>


            <button
                class="event-view"
                type="button"
            >
                查看詳細資料 →
            </button>

        </div>

    `;


    card
        .querySelector(".event-view")
        .addEventListener(
            "click",
            () => openModal(event)
        );


    return card;

}


/* =========================================================
   STATS
   ========================================================= */

function updateStats() {

    const total =
        events.length;


    const live =
        events.filter(
            event =>
                event.type === "Live"
        ).length;


    const fanMeetings =
        events.filter(
            event =>
                event.type === "Fan Meeting"
        ).length;


    const other =
        events.filter(
            event =>
                event.type !== "Live" &&
                event.type !== "Fan Meeting"
        ).length;


    document.getElementById(
        "totalCount"
    ).textContent = total;


    document.getElementById(
        "liveCount"
    ).textContent = live;


    document.getElementById(
        "fanmeetingCount"
    ).textContent = fanMeetings;


    document.getElementById(
        "eventCount"
    ).textContent = other;

}


/* =========================================================
   PAGINATION
   ========================================================= */

function updatePagination() {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredEvents.length /
                PAGE_SIZE
            )
        );


    pageInfo.textContent =
        `${currentPage} / ${totalPages}`;


    prevPage.disabled =
        currentPage <= 1;


    nextPage.disabled =
        currentPage >= totalPages;

}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    searchInput.addEventListener(
        "input",
        applyFilters
    );


    monthFilter.addEventListener(
        "change",
        applyFilters
    );


    dateFilter.addEventListener(
        "change",
        applyFilters
    );


    artistFilter.addEventListener(
        "change",
        applyFilters
    );


    typeFilter.addEventListener(
        "change",
        applyFilters
    );


    clearFilters.addEventListener(
        "click",
        clearAllFilters
    );


    emptyClear.addEventListener(
        "click",
        clearAllFilters
    );


    prevPage.addEventListener(
        "click",
        () => {

            if (currentPage > 1) {

                currentPage--;

                renderEvents();

                window.scrollTo({
                    top:
                        document.getElementById(
                            "events"
                        ).offsetTop - 90,

                    behavior: "smooth"
                });

            }

        }
    );


    nextPage.addEventListener(
        "click",
        () => {

            const totalPages =
                Math.ceil(
                    filteredEvents.length /
                    PAGE_SIZE
                );


            if (
                currentPage <
                totalPages
            ) {

                currentPage++;

                renderEvents();

                window.scrollTo({
                    top:
                        document.getElementById(
                            "events"
                        ).offsetTop - 90,

                    behavior: "smooth"
                });

            }

        }
    );


    modalClose.addEventListener(
        "click",
        closeModal
    );


    document
        .querySelector(".modal-overlay")
        .addEventListener(
            "click",
            closeModal
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeModal();

            }

        }
    );

}


/* =========================================================
   CLEAR FILTERS
   ========================================================= */

function clearAllFilters() {

    searchInput.value = "";

    monthFilter.value = "";

    dateFilter.value = "";

    artistFilter.value = "";

    typeFilter.value = "";

    applyFilters();

}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(event) {

    modalTitle.textContent =
        event.title || "Untitled Event";


    modalArtist.textContent =
        event.artist || "N/A";


    modalType.textContent =
        event.type || "Other";


    modalDate.textContent =
        formatFullDate(event.date);


    modalLocation.textContent =
        event.location || "—";


    modalDescription.textContent =
        event.description ||
        "No description available.";


    if (event.image) {

        modalImage.innerHTML = `
            <img
                src="${escapeHTML(event.image)}"
                alt="${escapeHTML(event.title)}"
            >
        `;

    } else {

        modalImage.innerHTML = `
            <div class="modal-image-placeholder">
                NF
            </div>
        `;

    }


    if (event.link) {

        modalLink.href =
            event.link;

        modalLink.classList.remove(
            "hidden"
        );

    } else {

        modalLink.classList.add(
            "hidden"
        );

    }


    modal.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";

}


function closeModal() {

    modal.classList.remove(
        "active"
    );

    document.body.style.overflow =
        "";

}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatShortDate(dateString) {

    const date =
        new Date(
            dateString + "T00:00:00"
        );


    return new Intl.DateTimeFormat(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(date);

}


function formatFullDate(dateString) {

    const date =
        new Date(
            dateString + "T00:00:00"
        );


    return new Intl.DateTimeFormat(
        "en-GB",
        {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    ).format(date);

}


function formatMonth(monthString) {

    const date =
        new Date(
            monthString + "-01T00:00:00"
        );


    return new Intl.DateTimeFormat(
        "en-GB",
        {
            month: "long",
            year: "numeric"
        }
    ).format(date);

}


/* =========================================================
   SECURITY
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
