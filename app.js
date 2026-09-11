/* =========================================================
   FROM PLUTO — NAMTANFILM ARCHIVE
   Event Archive
   Author: Guccimeng
   ========================================================= */


/* =========================================================
   SAMPLE DATA
   ?? events.json ???????
========================================================= */

const SAMPLE_EVENTS = [
    {
        Name: "PRO-TEEN SCHOOL TOUR 2025",
        Date: "August 1, 2025",
        Hashtag: null,
        KW: null,
        Location: "Ang Thong Patthamarot Witthayakhom School, Ang Thong",
        NAMTANFILM: "FILM",
        Type: "Event",
        Year: 2025
    }
];


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let events = [];
let filteredEvents = [];

let currentPage = 1;

const PAGE_SIZE = 16;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const eventsGrid = document.getElementById("eventsGrid");
const emptyState = document.getElementById("emptyState");

const searchInput = document.getElementById("searchInput");
const monthFilter = document.getElementById("monthFilter");
const dateFilter = document.getElementById("dateFilter");
const artistFilter = document.getElementById("artistFilter");
const typeFilter = document.getElementById("typeFilter");

const clearFilters = document.getElementById("clearFilters");
const emptyClear = document.getElementById("emptyClear");

const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

const modal = document.getElementById("eventModal");
const modalClose = document.getElementById("modalClose");

const modalTitle = document.getElementById("modalTitle");
const modalArtist = document.getElementById("modalArtist");
const modalType = document.getElementById("modalType");
const modalDate = document.getElementById("modalDate");
const modalLocation = document.getElementById("modalLocation");
const modalDescription = document.getElementById("modalDescription");
const modalLink = document.getElementById("modalLink");
const modalImage = document.getElementById("modalImage");


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", init);


async function init() {

    await loadEvents();

    setupFilters();

    updateStats();

    applyFilters();

    setupEvents();

}


/* =========================================================
   LOAD EVENTS
========================================================= */

async function loadEvents() {

    try {

        const response = await fetch("./data/events.json", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Unable to load events.json");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("events.json must contain an array");
        }

        events = data;

    } catch (error) {

        console.warn(
            "events.json could not be loaded. Using sample data.",
            error
        );

        events = SAMPLE_EVENTS;

    }


    /*
        ????

        ????????
        ???????????
    */

    events = events
        .filter(event => event.Date)
        .sort((a, b) => {

            return parseEventDate(b.Date) - parseEventDate(a.Date);

        });


    filteredEvents = [...events];

}


/* =========================================================
   DATE PARSER
========================================================= */

function parseEventDate(dateString) {

    if (!dateString) {
        return null;
    }


    /*
        ???

        August 1, 2025
        January 15, 2026

        ????

        2025-08-01
    */

    const date = new Date(dateString);


    if (Number.isNaN(date.getTime())) {

        /*
            ???? YYYY-MM-DD
        */

        const parts = String(dateString).split("-");

        if (parts.length === 3) {

            const year = Number(parts[0]);
            const month = Number(parts[1]) - 1;
            const day = Number(parts[2]);

            const fallbackDate = new Date(
                year,
                month,
                day
            );

            if (!Number.isNaN(fallbackDate.getTime())) {
                return fallbackDate;
            }

        }

        return null;
    }


    return date;

}


/* =========================================================
   NORMALIZED DATE
   ???? YYYY-MM-DD
========================================================= */

function getDateKey(dateString) {

    const date = parseEventDate(dateString);

    if (!date) {
        return "";
    }


    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


/* =========================================================
   GET YEAR
========================================================= */

function getEventYear(event) {

    /*
        ???? JSON ??? Year
    */

    if (event.Year) {
        return String(event.Year);
    }


    /*
        ?? Year ????? Date ????
    */

    const date = parseEventDate(event.Date);

    if (!date) {
        return "";
    }

    return String(date.getFullYear());

}


/* =========================================================
   GET MONTH KEY
========================================================= */

function getMonthKey(event) {

    const date = parseEventDate(event.Date);

    if (!date) {
        return "";
    }


    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");


    return `${year}-${month}`;

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

    /*
        ?????? option
        ?? All Months
    */

    monthFilter.innerHTML = `
        <option value="">All Months</option>
    `;


    const months = [
        ...new Set(
            events
                .map(event => getMonthKey(event))
                .filter(Boolean)
        )
    ]
    .sort()
    .reverse();


    months.forEach(month => {

        const option = document.createElement("option");

        option.value = month;

        option.textContent = formatMonth(month);

        monthFilter.appendChild(option);

    });

}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

    const search = searchInput.value
        .trim()
        .toLowerCase();

    const month = monthFilter.value;

    const selectedDate = dateFilter.value;

    const artist = artistFilter.value;

    const type = typeFilter.value;


    filteredEvents = events.filter(event => {


        /*
            ????????

            Name
            Location
            NAMTANFILM
            Type
            Hashtag
            KW
            Year
        */

        const searchableText = [

            event.Name,

            event.Location,

            event.NAMTANFILM,

            event.Type,

            event.Hashtag,

            event.KW,

            event.Year

        ]
        .filter(value => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();


        const matchesSearch =
            !search ||
            searchableText.includes(search);


        const matchesMonth =
            !month ||
            getMonthKey(event) === month;


        const matchesDate =
            !selectedDate ||
            getDateKey(event.Date) === selectedDate;


        const matchesArtist =
            !artist ||
            event.NAMTANFILM === artist;


        const matchesType =
            !type ||
            event.Type === type;


        return (
            matchesSearch &&
            matchesMonth &&
            matchesDate &&
            matchesArtist &&
            matchesType
        );

    });


    /*
        ????????
    */

    filteredEvents.sort((a, b) => {

        return (
            parseEventDate(b.Date) -
            parseEventDate(a.Date)
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


    const total = filteredEvents.length;


    /*
        ??????
    */

    const resultCount = document.getElementById(
        "resultCount"
    );

    if (resultCount) {
        resultCount.textContent = total;
    }


    /*
        ????
    */

    if (total === 0) {

        emptyState.classList.remove("hidden");

        updatePagination();

        return;

    }


    emptyState.classList.add("hidden");


    /*
        Pagination
    */

    const start =
        (currentPage - 1) * PAGE_SIZE;


    const end =
        start + PAGE_SIZE;


    const pageEvents =
        filteredEvents.slice(start, end);


    /*
        Render cards
    */

    pageEvents.forEach(event => {

        const card = createEventCard(event);

        eventsGrid.appendChild(card);

    });


    updatePagination();

}


/* =========================================================
   CREATE EVENT CARD
========================================================= */

function createEventCard(event) {

    const card = document.createElement("article");

    card.className = "event-card";


    /*
        ?? JSON ???? image ???

        ???????

        "Image": "images/event01.jpg"

        ????????
    */

    const imagePath =
        event.Image ||
        event.image ||
        "";


    const imageHTML = imagePath

        ? `
            <img
                src="${escapeHTML(imagePath)}"
                alt="${escapeHTML(event.Name || "Event")}"
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
                ${escapeHTML(
                    formatShortDate(event.Date)
                )}
            </div>

        </div>


        <div class="event-body">

            <div class="event-tags">

                <span class="tag">
                    ${escapeHTML(
                        event.NAMTANFILM || "N/A"
                    )}
                </span>

                <span class="tag">
                    ${escapeHTML(
                        event.Type || "Other"
                    )}
                </span>

            </div>


            <h3 class="event-title">
                ${escapeHTML(
                    event.Name || "Untitled Event"
                )}
            </h3>


            <div class="event-location">
                ?
                ${escapeHTML(
                    event.Location || "—"
                )}
            </div>


            <button
                class="event-view"
                type="button"
            >
                ?????? ?
            </button>

        </div>

    `;


    const viewButton =
        card.querySelector(".event-view");


    viewButton.addEventListener(
        "click",
        () => openModal(event)
    );


    return card;

}



/* =========================================================
   UPDATE STATISTICS
========================================================= */

function updateStats() {

    /*
        =====================================================
        ARTIST STATS
        =====================================================

        Based on:

        event.NAMTANFILM

        Expected values:

        NAMTAN
        FILM
        NAMTANFILM
    */


    const total =
        events.length;


    const namtanEvents =
        events.filter(event =>
            String(event.NAMTANFILM || "")
                .trim()
                .toUpperCase() === "NAMTAN"
        ).length;


    const filmEvents =
        events.filter(event =>
            String(event.NAMTANFILM || "")
                .trim()
                .toUpperCase() === "FILM"
        ).length;


    const namtanfilmEvents =
        events.filter(event =>
            String(event.NAMTANFILM || "")
                .trim()
                .toUpperCase() === "NAMTANFILM"
        ).length;


    /*
        =====================================================
        TYPE STATS
        =====================================================

        Series
        Fan Meeting
        Concert
        Other Events = everything else
    */


    const seriesEvents =
        events.filter(event =>
            String(event.Type || "")
                .trim()
                .toUpperCase() === "SERIES"
        ).length;


    const fanmeetingEvents =
        events.filter(event =>
            String(event.Type || "")
                .trim()
                .toUpperCase() === "FAN MEETING"
        ).length;


    const concertEvents =
        events.filter(event =>
            String(event.Type || "")
                .trim()
                .toUpperCase() === "CONCERT"
        ).length;


    /*
        Other Events

        Everything that is NOT:

        Series
        Fan Meeting
        Concert
    */

    const otherEvents =
        events.filter(event => {

            const type =
                String(event.Type || "")
                    .trim()
                    .toUpperCase();


            return (
                type !== "SERIES" &&
                type !== "FAN MEETING" &&
                type !== "CONCERT"
            );

        }).length;


    /*
        =====================================================
        UPDATE HTML
        =====================================================
    */


    /*
        FIRST ROW
    */

    const totalCount =
        document.getElementById(
            "totalCount"
        );


    const namtanCount =
        document.getElementById(
            "namtanCount"
        );


    const filmCount =
        document.getElementById(
            "filmCount"
        );


    const namtanfilmCount =
        document.getElementById(
            "namtanfilmCount"
        );


    /*
        SECOND ROW
    */

    const seriesCount =
        document.getElementById(
            "seriesCount"
        );


    const fanmeetingCount =
        document.getElementById(
            "fanmeetingCount"
        );


    const concertCount =
        document.getElementById(
            "concertCount"
        );


    const otherEventsCount =
        document.getElementById(
            "otherEventsCount"
        );


    /*
        Set values
    */


    if (totalCount) {

        totalCount.textContent =
            total;

    }


    if (namtanCount) {

        namtanCount.textContent =
            namtanEvents;

    }


    if (filmCount) {

        filmCount.textContent =
            filmEvents;

    }


    if (namtanfilmCount) {

        namtanfilmCount.textContent =
            namtanfilmEvents;

    }


    if (seriesCount) {

        seriesCount.textContent =
            seriesEvents;

    }


    if (fanmeetingCount) {

        fanmeetingCount.textContent =
            fanmeetingEvents;

    }


    if (concertCount) {

        concertCount.textContent =
            concertEvents;

    }


    if (otherEventsCount) {

        otherEventsCount.textContent =
            otherEvents;

    }

}

/* =========================================================
   PAGINATION
========================================================= */

function updatePagination() {

    const totalPages = Math.max(
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
   EVENT LISTENERS
========================================================= */

function setupEvents() {


    /*
        Search
    */

    searchInput.addEventListener(
        "input",
        applyFilters
    );


    /*
        Filters
    */

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


    /*
        Clear filters
    */

    clearFilters.addEventListener(
        "click",
        clearAllFilters
    );


    emptyClear.addEventListener(
        "click",
        clearAllFilters
    );


    /*
        Previous page
    */

    prevPage.addEventListener(
        "click",
        () => {

            if (currentPage > 1) {

                currentPage--;

                renderEvents();

                scrollToEvents();

            }

        }
    );


    /*
        Next page
    */

    nextPage.addEventListener(
        "click",
        () => {

            const totalPages =
                Math.ceil(
                    filteredEvents.length /
                    PAGE_SIZE
                );


            if (currentPage < totalPages) {

                currentPage++;

                renderEvents();

                scrollToEvents();

            }

        }
    );


    /*
        Modal
    */

    modalClose.addEventListener(
        "click",
        closeModal
    );


    const modalOverlay =
        document.querySelector(".modal-overlay");


    if (modalOverlay) {

        modalOverlay.addEventListener(
            "click",
            closeModal
        );

    }


    /*
        ESC
    */

    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {

                closeModal();

            }

        }
    );

}


/* =========================================================
   SCROLL TO EVENTS
========================================================= */

function scrollToEvents() {

    const eventsSection =
        document.getElementById("events");


    if (!eventsSection) {
        return;
    }


    window.scrollTo({

        top:
            eventsSection.offsetTop - 90,

        behavior: "smooth"

    });

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
   OPEN MODAL
========================================================= */

function openModal(event) {


    /*
        Title
    */

    modalTitle.textContent =
        event.Name ||
        "Untitled Event";


    /*
        Artist
    */

    modalArtist.textContent =
        event.NAMTANFILM ||
        "N/A";


    /*
        Type
    */

    modalType.textContent =
        event.Type ||
        "Other";


    /*
        Date
    */

    modalDate.textContent =
        formatFullDate(
            event.Date
        );


    /*
        Location
    */

    modalLocation.textContent =
        event.Location ||
        "—";


    /*
        Description

        ???? JSON ?? Description?
        ??????? Hashtag / KW?

        ????? Description?
        ???????
    */

    let description = "";


    if (event.Description) {

        description =
            event.Description;

    } else {

        const extraInfo = [];


        if (event.Hashtag) {

            extraInfo.push(
                `Hashtag: ${event.Hashtag}`
            );

        }


        if (event.KW) {

            extraInfo.push(
                `Keywords: ${event.KW}`
            );

        }


        description =
            extraInfo.length > 0
                ? extraInfo.join(" · ")
                : "No description available.";

    }


    modalDescription.textContent =
        description;


    /*
        Image

        ???

        Image
        image

        ???????? NF?
    */

    const imagePath =
        event.Image ||
        event.image ||
        "";


    if (imagePath) {

        modalImage.innerHTML = `

            <img
                src="${escapeHTML(imagePath)}"
                alt="${escapeHTML(
                    event.Name || "Event"
                )}"
            >

        `;

    } else {

        modalImage.innerHTML = `
            <div class="modal-image-placeholder">
                NF
            </div>
        `;

    }


    /*
        Related Link

        ???

        Link
        link
    */

    const eventLink =
        event.Link ||
        event.link ||
        "";


    if (eventLink) {

        modalLink.href =
            eventLink;

        modalLink.classList.remove(
            "hidden"
        );

    } else {

        modalLink.classList.add(
            "hidden"
        );

        modalLink.removeAttribute(
            "href"
        );

    }


    /*
        Open modal
    */

    modal.classList.add("active");

    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    modal.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";

}


/* =========================================================
   FORMAT SHORT DATE
========================================================= */

function formatShortDate(dateString) {

    const date =
        parseEventDate(dateString);


    if (!date) {
        return dateString || "—";
    }


    return new Intl.DateTimeFormat(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(date);

}


/* =========================================================
   FORMAT FULL DATE
========================================================= */

function formatFullDate(dateString) {

    const date =
        parseEventDate(dateString);


    if (!date) {
        return dateString || "—";
    }


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


/* =========================================================
   FORMAT MONTH
========================================================= */

function formatMonth(monthString) {

    const date =
        new Date(
            `${monthString}-01T00:00:00`
        );


    if (Number.isNaN(date.getTime())) {
        return monthString;
    }


    return new Intl.DateTimeFormat(
        "en-GB",
        {
            month: "long",
            year: "numeric"
        }
    ).format(date);

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}
