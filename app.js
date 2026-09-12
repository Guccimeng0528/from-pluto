/* =========================================================
   FROM PLUTO — NAMTANFILM ARCHIVE
   Event Archive + Instagram Feed
   Author: Guccimeng
   ========================================================= */


/* =========================================================
   SAMPLE DATA
========================================================= */

const SAMPLE_EVENTS = [
    {
        Name: "PRO-TEEN SCHOOL TOUR 2025",
        Date: "August 1, 2025",
        Hashtag: null,
        KW: null,
        Location: null,
        NAMTANFILM: ["NAMTAN", "FILM"],
        Type: "Event",
        Year: 2025,
        Image: null
    }
];


/* =========================================================
   GLOBAL STATE
========================================================= */

let events = [];
let filteredEvents = [];

let currentPage = 1;

const PAGE_SIZE = 20;


/* =========================================================
   INSTAGRAM CONFIG
========================================================= */

const INSTAGRAM_API_URL = "./api/instagram";

const INSTAGRAM_ACCOUNTS = [
    {
        key: "namtan",
        username: "@namtan.tipnaree",
        elementId: "instagramNamtan"
    },
    {
        key: "film",
        username: "@fr.racha",
        elementId: "instagramFilm"
    },
    {
        key: "lunar",
        username: "@lunar.gmmtv",
        elementId: "instagramLunar"
    }
];

const INSTAGRAM_POST_LIMIT = 20;


/* =========================================================
   DOM ELEMENTS
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


/* =========================================================
   PAGINATION DOM
========================================================= */

const prevPage =
    document.getElementById("prevPage");

const nextPage =
    document.getElementById("nextPage");

const firstPage =
    document.getElementById("firstPage");

const pageNumbers =
    document.getElementById("pageNumbers");

const lastPage =
    document.getElementById("lastPage");

const pageInfo =
    document.getElementById("pageInfo");


/* =========================================================
   MODAL DOM
========================================================= */

const eventModal =
    document.getElementById("eventModal");

const modalOverlay =
    eventModal?.querySelector(
        ".modal-overlay"
    );

const modalClose =
    document.getElementById("modalClose");

const modalImage =
    document.getElementById("modalImage");

const modalArtist =
    document.getElementById("modalArtist");

const modalType =
    document.getElementById("modalType");

const modalTitle =
    document.getElementById("modalTitle");

const modalDate =
    document.getElementById("modalDate");

const modalLocation =
    document.getElementById("modalLocation");

const modalDescription =
    document.getElementById(
        "modalDescription"
    );

const modalLink =
    document.getElementById("modalLink");


/* =========================================================
   INIT
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

    loadInstagramFeeds();
}


/* =========================================================
   LOAD EVENTS
========================================================= */

async function loadEvents() {

    try {

        const response =
            await fetch(
                "/api/events",
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "Events API did not return an array."
            );
        }

        events =
            data.filter(
                event =>
                    event &&
                    event.Date
            );

    } catch (error) {

        console.error(
            "Failed to load events:",
            error
        );

        events =
            SAMPLE_EVENTS.filter(
                event =>
                    event &&
                    event.Date
            );
    }


    /* -----------------------------------------------------
       SORT EVENTS
    ----------------------------------------------------- */

    events.sort(
        (a, b) => {

            const dateA =
                parseEventDate(
                    a.Date
                );

            const dateB =
                parseEventDate(
                    b.Date
                );

            if (!dateA && !dateB) {
                return 0;
            }

            if (!dateA) {
                return 1;
            }

            if (!dateB) {
                return -1;
            }

            return (
                dateB.getTime() -
                dateA.getTime()
            );
        }
    );


    filteredEvents =
        [...events];
}


/* =========================================================
   FILTER SETUP
========================================================= */

function setupFilters() {

    const filterElements = [
        searchInput,
        monthFilter,
        dateFilter,
        artistFilter,
        typeFilter
    ];

    filterElements.forEach(
        element => {

            if (!element) {
                return;
            }

            element.addEventListener(
                "input",
                applyFilters
            );

            element.addEventListener(
                "change",
                applyFilters
            );
        }
    );


    /* -----------------------------------------------------
       MONTH FILTER OPTIONS
    ----------------------------------------------------- */

    if (monthFilter) {

        const currentValue =
            monthFilter.value;

        const months = [
            ...new Set(
                events
                    .map(event => {

                        const date =
                            parseEventDate(
                                event.Date
                            );

                        if (!date) {
                            return null;
                        }

                        return String(
                            date.getMonth() + 1
                        ).padStart(2, "0");
                    })
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                Number(a) -
                Number(b)
        );


        monthFilter.innerHTML = `
            <option value="">
                All Months
            </option>

            ${months.map(month => {

                const monthName =
                    new Intl.DateTimeFormat(
                        "en-US",
                        {
                            month: "long"
                        }
                    ).format(
                        new Date(
                            2000,
                            Number(month) - 1,
                            1
                        )
                    );

                return `
                    <option value="${month}">
                        ${monthName}
                    </option>
                `;

            }).join("")}
        `;


        if (
            months.includes(
                currentValue
            )
        ) {
            monthFilter.value =
                currentValue;
        }
    }


    /* -----------------------------------------------------
       TYPE FILTER OPTIONS
    ----------------------------------------------------- */

    if (typeFilter) {

        const currentValue =
            typeFilter.value;

        const types = [
            ...new Set(
                events
                    .flatMap(event => {

                        if (
                            Array.isArray(
                                event.Type
                            )
                        ) {
                            return event.Type;
                        }

                        return event.Type
                            ? [event.Type]
                            : [];
                    })
                    .map(
                        value =>
                            String(
                                value
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(b)
        );


        typeFilter.innerHTML = `
            <option value="">
                All Types
            </option>

            ${types.map(type => `
                <option value="${escapeHTML(type)}">
                    ${escapeHTML(type)}
                </option>
            `).join("")}
        `;


        if (
            types.includes(
                currentValue
            )
        ) {
            typeFilter.value =
                currentValue;
        }
    }

/* =========================================================
   CLEAR ALL FILTERS
========================================================= */

function clearAllFilters() {

    if (searchInput) {
        searchInput.value = "";
    }

    if (monthFilter) {
        monthFilter.value = "";
    }

    if (dateFilter) {
        dateFilter.value = "";
    }

    if (artistFilter) {
        artistFilter.value = "";
    }

    if (typeFilter) {
        typeFilter.value = "";
    }

    currentPage = 1;

    applyFilters();
}


   /* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

    const search =
        searchInput?.value
            ?.trim()
            .toLowerCase() || "";

    const month =
        monthFilter?.value || "";

    const date =
        dateFilter?.value || "";

    const artist =
        artistFilter?.value || "";

    const type =
        typeFilter?.value || "";


    filteredEvents =
        events.filter(
            event => {

                /* -----------------------------------------
                   SEARCH
                ----------------------------------------- */

                const searchableText = [
                    event.Name,
                    event.Location,
                    event.NAMTANFILM,
                    event.Type,
                    event.Hashtag,
                    event.KW,
                    event.Year
                ]
                    .flat()
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                if (
                    search &&
                    !searchableText.includes(
                        search
                    )
                ) {
                    return false;
                }


                /* -----------------------------------------
                   MONTH FILTER
                ----------------------------------------- */

                if (month) {

                    const eventDate =
                        parseEventDate(
                            event.Date
                        );

                    if (!eventDate) {
                        return false;
                    }

                    const eventMonth =
                        String(
                            eventDate.getMonth() + 1
                        ).padStart(
                            2,
                            "0"
                        );

                    if (
                        eventMonth !==
                        month
                    ) {
                        return false;
                    }
                }


                /* -----------------------------------------
                   DATE FILTER
                ----------------------------------------- */

                if (date) {

                    const eventDate =
                        parseEventDate(
                            event.Date
                        );

                    if (!eventDate) {
                        return false;
                    }

                    const eventDateString =
                        [
                            eventDate.getFullYear(),
                            String(
                                eventDate.getMonth() + 1
                            ).padStart(2, "0"),
                            String(
                                eventDate.getDate()
                            ).padStart(2, "0")
                        ].join("-");


                    if (
                        eventDateString !==
                        date
                    ) {
                        return false;
                    }
                }


                /* -----------------------------------------
                   ARTIST FILTER
                ----------------------------------------- */

                if (artist) {

                    const artistValue =
                        Array.isArray(
                            event.NAMTANFILM
                        )
                            ? event.NAMTANFILM
                            : [
                                event.NAMTANFILM
                            ];

                    const normalizedArtists =
                        artistValue
                            .filter(Boolean)
                            .map(
                                value =>
                                    String(
                                        value
                                    )
                                        .trim()
                                        .toLowerCase()
                            );

                    if (
                        !normalizedArtists.includes(
                            artist
                                .trim()
                                .toLowerCase()
                        )
                    ) {
                        return false;
                    }
                }


                /* -----------------------------------------
                   TYPE FILTER
                ----------------------------------------- */

                if (type) {

                    const typeValue =
                        Array.isArray(
                            event.Type
                        )
                            ? event.Type
                            : [
                                event.Type
                            ];

                    const normalizedTypes =
                        typeValue
                            .filter(Boolean)
                            .map(
                                value =>
                                    String(
                                        value
                                    )
                                        .trim()
                                        .toLowerCase()
                            );

                    if (
                        !normalizedTypes.includes(
                            type
                                .trim()
                                .toLowerCase()
                        )
                    ) {
                        return false;
                    }
                }


                return true;
            }
        );


    /* -----------------------------------------------------
       RESET TO FIRST PAGE
    ----------------------------------------------------- */

    currentPage = 1;


    /* -----------------------------------------------------
       RESULT COUNT
    ----------------------------------------------------- */

    const resultCount =
        document.getElementById("result-count") ||
        document.getElementById("resultCount") ||
        document.querySelector(".result-count");

    if (resultCount) {

        resultCount.textContent =
            filteredEvents.length;
    }


    /* -----------------------------------------------------
       RENDER
    ----------------------------------------------------- */

    renderEvents();
}


/* =========================================================
   RENDER EVENTS
========================================================= */

function renderEvents() {

    if (!eventsGrid) {
        console.error(
            "eventsGrid was not found."
        );

        return;
    }


    eventsGrid.innerHTML = "";


    /* -----------------------------------------------------
       EMPTY STATE
    ----------------------------------------------------- */

    const total =
        filteredEvents.length;

    if (total === 0) {

        if (emptyState) {
            emptyState.classList.remove(
                "hidden"
            );
        }

        renderPagination();

        return;
    }


    if (emptyState) {
        emptyState.classList.add(
            "hidden"
        );
    }


    /* -----------------------------------------------------
       PAGE CALCULATION
    ----------------------------------------------------- */

    const totalPages =
        Math.ceil(
            total /
            PAGE_SIZE
        );


    if (
        currentPage >
        totalPages
    ) {
        currentPage =
            totalPages;
    }


    const startIndex =
        (
            currentPage -
            1
        ) *
        PAGE_SIZE;


    const endIndex =
        startIndex +
        PAGE_SIZE;


    const pageEvents =
        filteredEvents.slice(
            startIndex,
            endIndex
        );


    /* -----------------------------------------------------
       CREATE EVENT CARDS
    ----------------------------------------------------- */

    pageEvents.forEach(
        event => {

            const card =
                createEventCard(
                    event
                );

            eventsGrid.appendChild(
                card
            );
        }
    );


    /* -----------------------------------------------------
       IMPORTANT:
       NEW PAGINATION FUNCTION
    ----------------------------------------------------- */

    renderPagination();
}


/* =========================================================
   CREATE EVENT CARD
========================================================= */

function createEventCard(event) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "event-card";


    /* -----------------------------------------------------
       IMAGE
    ----------------------------------------------------- */

    const imagePath =
        event.Image ||
        event.image ||
        "";


    const imageHTML =
        imagePath
            ? `
                <img
                    src="${escapeHTML(
                        imagePath
                    )}"
                    alt="${escapeHTML(
                        event.Name ||
                        "Event"
                    )}"
                    loading="lazy"
                >
            `
            : `
                <div
                    class="event-image-placeholder"
                >
                    NF
                </div>
            `;


    /* -----------------------------------------------------
       TYPE
    ----------------------------------------------------- */

    const typeDisplay =
        Array.isArray(
            event.Type
        )
            ? event.Type.join(
                ", "
            )
            : event.Type ||
              "Other";


    /* -----------------------------------------------------
       ARTIST
    ----------------------------------------------------- */

    const artistDisplay =
        Array.isArray(
            event.NAMTANFILM
        )
            ? event.NAMTANFILM.join(
                ", "
            )
            : event.NAMTANFILM ||
              "N/A";


    /* -----------------------------------------------------
       CARD HTML

       DATE IS BETWEEN IMAGE + BODY
    ----------------------------------------------------- */

    card.innerHTML = `
        <div class="event-image">
            ${imageHTML}
        </div>

        <div class="event-date">
            ${escapeHTML(
                formatShortDate(
                    event.Date
                )
            )}
        </div>

        <div class="event-body">

            <div class="event-tags">

                <span class="tag">
                    ${escapeHTML(
                        artistDisplay
                    )}
                </span>

                <span class="tag">
                    ${escapeHTML(
                        typeDisplay
                    )}
                </span>

            </div>


            <h3 class="event-title">
                ${escapeHTML(
                    event.Name ||
                    "Untitled Event"
                )}
            </h3>


            <button
                class="event-view"
                type="button"
            >
                View Event
            </button>

        </div>
    `;


    /* -----------------------------------------------------
       VIEW BUTTON
    ----------------------------------------------------- */

    const viewButton =
        card.querySelector(
            ".event-view"
        );


    if (viewButton) {

        viewButton.addEventListener(
            "click",
            () => {

                openModal(
                    event
                );

            }
        );
    }


    return card;
}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination() {

    if (!pageNumbers) {
        return;
    }


    const totalPages =
        Math.ceil(
            filteredEvents.length /
            PAGE_SIZE
        );


    /* -----------------------------------------------------
       CLEAR OLD PAGE NUMBERS
    ----------------------------------------------------- */

    pageNumbers.innerHTML = "";


    /* -----------------------------------------------------
       NO / ONE PAGE
    ----------------------------------------------------- */

    if (totalPages <= 1) {

        if (firstPage) {
            firstPage.disabled =
                true;
        }

        if (prevPage) {
            prevPage.disabled =
                true;
        }

        if (nextPage) {
            nextPage.disabled =
                true;
        }

        if (lastPage) {
            lastPage.disabled =
                true;
        }

        return;
    }


    /* -----------------------------------------------------
       SAFETY
    ----------------------------------------------------- */

    if (
        currentPage >
        totalPages
    ) {
        currentPage =
            totalPages;
    }


    /* -----------------------------------------------------
       FIRST / PREVIOUS
    ----------------------------------------------------- */

    if (firstPage) {

        firstPage.disabled =
            currentPage === 1;
    }


    if (prevPage) {

        prevPage.disabled =
            currentPage === 1;
    }


    /* -----------------------------------------------------
       NEXT / LAST
    ----------------------------------------------------- */

    if (nextPage) {

        nextPage.disabled =
            currentPage ===
            totalPages;
    }


    if (lastPage) {

        lastPage.disabled =
            currentPage ===
            totalPages;
    }


    /* -----------------------------------------------------
       PAGE NUMBER RANGE

       Example:

       1 2 3 4 5 6 7 8 9

       When current page moves:

       2 3 4 5 6 7 8 9 10

    ----------------------------------------------------- */

    let startPage =
        Math.max(
            1,
            currentPage - 4
        );


    let endPage =
        Math.min(
            totalPages,
            startPage + 8
        );


    if (
        endPage -
        startPage <
        8
    ) {

        startPage =
            Math.max(
                1,
                endPage - 8
            );
    }


    /* -----------------------------------------------------
       CREATE PAGE BUTTONS
    ----------------------------------------------------- */

    for (
        let page = startPage;
        page <= endPage;
        page++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "page-btn page-number";


        button.textContent =
            page;


        /* -------------------------------------------------
           ACTIVE PAGE
        ------------------------------------------------- */

        if (
            page ===
            currentPage
        ) {

            button.classList.add(
                "active"
            );
        }


        /* -------------------------------------------------
           CLICK PAGE
        ------------------------------------------------- */

        button.addEventListener(
            "click",
            () => {

                currentPage =
                    page;

                renderEvents();

                renderPagination();

                scrollToEvents();
            }
        );


        pageNumbers.appendChild(
            button
        );
    }


    /* -----------------------------------------------------
       PAGE INFO

       Kept for compatibility if
       schedule.html still contains #pageInfo.
    ----------------------------------------------------- */

    if (pageInfo) {

        pageInfo.textContent =
            `${currentPage} / ${totalPages}`;
    }
}


/* =========================================================
   EVENT CONTROLS
========================================================= */

function setupEvents() {


    /* -----------------------------------------------------
       PREVIOUS
    ----------------------------------------------------- */

    if (prevPage) {

        prevPage.addEventListener(
            "click",
            () => {

                if (
                    currentPage >
                    1
                ) {

                    currentPage--;

                    renderEvents();

                    renderPagination();

                    scrollToEvents();
                }
            }
        );
    }


    /* -----------------------------------------------------
       NEXT
    ----------------------------------------------------- */

    if (nextPage) {

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

                    renderPagination();

                    scrollToEvents();
                }
            }
        );
    }


    /* -----------------------------------------------------
       FIRST
    ----------------------------------------------------- */

    if (firstPage) {

        firstPage.addEventListener(
            "click",
            () => {

                currentPage =
                    1;

                renderEvents();

                renderPagination();

                scrollToEvents();
            }
        );
    }


    /* -----------------------------------------------------
       LAST
    ----------------------------------------------------- */

    if (lastPage) {

        lastPage.addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.ceil(
                        filteredEvents.length /
                        PAGE_SIZE
                    );


                currentPage =
                    totalPages;


                renderEvents();

                renderPagination();

                scrollToEvents();
            }
        );
    }


    /* -----------------------------------------------------
       MODAL CLOSE
    ----------------------------------------------------- */

    if (modalClose) {

        modalClose.addEventListener(
            "click",
            closeModal
        );
    }


    if (modalOverlay) {

        modalOverlay.addEventListener(
            "click",
            closeModal
        );
    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

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
        document.getElementById(
            "events-section"
        );


    if (!eventsSection) {
        return;
    }


    const offset =
        100;


    const top =
        eventsSection.getBoundingClientRect()
            .top +
        window.scrollY -
        offset;


    window.scrollTo({
        top,
        behavior: "smooth"
    });
}


/* =========================================================
   STATS
========================================================= */

function updateStats() {

    /* -----------------------------------------------------
       TOTAL EVENTS
    ----------------------------------------------------- */

    const totalCount =
        document.getElementById("totalCount");

    if (totalCount) {
        totalCount.textContent = events.length;
    }


    /* -----------------------------------------------------
       NAMTAN EVENTS
    ----------------------------------------------------- */

    const namtanCount =
        document.getElementById("namtanCount");

    if (namtanCount) {

        const count =
            events.filter(event => {

                const value =
                    Array.isArray(event.NAMTANFILM)
                        ? event.NAMTANFILM
                        : [event.NAMTANFILM];

                return value.some(item =>
                    String(item || "")
                        .toLowerCase()
                        .includes("namtan")
                );
            }).length;

        namtanCount.textContent = count;
    }


    /* -----------------------------------------------------
       FILM EVENTS
    ----------------------------------------------------- */

    const filmCount =
        document.getElementById("filmCount");

    if (filmCount) {

        const count =
            events.filter(event => {

                const value =
                    Array.isArray(event.NAMTANFILM)
                        ? event.NAMTANFILM
                        : [event.NAMTANFILM];

                return value.some(item =>
                    String(item || "")
                        .toLowerCase()
                        .includes("film")
                );
            }).length;

        filmCount.textContent = count;
    }


    /* -----------------------------------------------------
       NAMTANFILM EVENTS
    ----------------------------------------------------- */

    const namtanfilmCount =
        document.getElementById("namtanfilmCount");

    if (namtanfilmCount) {

        const count =
            events.filter(event => {

                const value =
                    Array.isArray(event.NAMTANFILM)
                        ? event.NAMTANFILM
                        : [event.NAMTANFILM];

                const text =
                    value
                        .map(item => String(item || ""))
                        .join(" ")
                        .toLowerCase();

                return (
                    text.includes("namtan") &&
                    text.includes("film")
                );
            }).length;

        namtanfilmCount.textContent = count;
    }


    /* -----------------------------------------------------
       SERIES
    ----------------------------------------------------- */

    const seriesCount =
        document.getElementById("seriesCount");

    if (seriesCount) {

        const count =
            events.filter(event =>
                String(event.Type || "")
                    .toLowerCase()
                    .includes("series")
            ).length;

        seriesCount.textContent = count;
    }


    /* -----------------------------------------------------
       FANMEETING
    ----------------------------------------------------- */

    const fanmeetingCount =
        document.getElementById("fanmeetingCount");

    if (fanmeetingCount) {

        const count =
            events.filter(event =>
                String(event.Type || "")
                    .toLowerCase()
                    .includes("fanmeeting")
            ).length;

        fanmeetingCount.textContent = count;
    }


    /* -----------------------------------------------------
       CONCERT
    ----------------------------------------------------- */

    const concertCount =
        document.getElementById("concertCount");

    if (concertCount) {

        const count =
            events.filter(event =>
                String(event.Type || "")
                    .toLowerCase()
                    .includes("concert")
            ).length;

        concertCount.textContent = count;
    }


    /* -----------------------------------------------------
       OTHER EVENTS
    ----------------------------------------------------- */

    const otherEventsCount =
        document.getElementById("otherEventsCount");

    if (otherEventsCount) {

        const count =
            events.filter(event => {

                const type =
                    String(event.Type || "")
                        .toLowerCase()
                        .trim();

                return (
                    type !== "" &&
                    !type.includes("series") &&
                    !type.includes("fanmeeting") &&
                    !type.includes("concert")
                );
            }).length;

        otherEventsCount.textContent = count;
    }
}


/* =========================================================
   DATE PARSER
========================================================= */

function parseEventDate(
    dateString
) {

    if (!dateString) {
        return null;
    }


    const value =
        String(
            dateString
        ).trim();


    if (!value) {
        return null;
    }


    /* -----------------------------------------------------
       REMOVE DATE RANGE END
    ----------------------------------------------------- */

    const firstDate =
        value
            .split("→")[0]
            .trim();


    /* -----------------------------------------------------
       ISO DATE
    ----------------------------------------------------- */

    if (
        /^\d{4}-\d{2}-\d{2}/.test(
            firstDate
        )
    ) {

        const date =
            new Date(
                firstDate
            );


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date;
        }
    }


    /* -----------------------------------------------------
       STANDARD JS DATE
    ----------------------------------------------------- */

    const parsed =
        new Date(
            firstDate
        );


    if (
        !Number.isNaN(
            parsed.getTime()
        )
    ) {

        return parsed;
    }


    return null;
}


/* =========================================================
   SHORT DATE
========================================================= */

function formatShortDate(
    dateString
) {

    if (!dateString) {
        return "";
    }


    const date =
        parseEventDate(
            dateString
        );


    if (!date) {
        return dateString;
    }


    const hasTime =
        /T\d{2}:\d{2}/.test(
            String(
                dateString
            )
        );


    const options = {
        day: "2-digit",
        month: "short",
        year: "numeric"
    };


    if (hasTime) {

        options.hour =
            "2-digit";

        options.minute =
            "2-digit";

        options.hour12 =
            false;
    }


    return new Intl.DateTimeFormat(
        "en-GB",
        options
    ).format(date);
}


/* =========================================================
   FULL DATE
========================================================= */

function formatFullDate(
    dateString
) {

    if (!dateString) {
        return "—";
    }


    const date =
        parseEventDate(
            dateString
        );


    if (!date) {
        return dateString;
    }


    const hasTime =
        /T\d{2}:\d{2}/.test(
            String(
                dateString
            )
        );


    const options = {
        day: "2-digit",
        month: "short",
        year: "numeric"
    };


    if (hasTime) {

        options.hour =
            "2-digit";

        options.minute =
            "2-digit";

        options.hour12 =
            false;
    }


    return new Intl.DateTimeFormat(
        "en-GB",
        options
    ).format(date);
}


/* =========================================================
   MODAL
========================================================= */

function openModal(event) {

    if (!eventModal) {
        return;
    }


    /* -----------------------------------------------------
       ARTIST
    ----------------------------------------------------- */

    if (modalArtist) {

        modalArtist.textContent =
            Array.isArray(event.NAMTANFILM)
                ? event.NAMTANFILM.join(", ")
                : event.NAMTANFILM || "N/A";
    }


    /* -----------------------------------------------------
       TYPE
    ----------------------------------------------------- */

    if (modalType) {

        modalType.textContent =
            Array.isArray(event.Type)
                ? event.Type.join(", ")
                : event.Type || "Other";
    }


    /* -----------------------------------------------------
       TITLE
    ----------------------------------------------------- */

    if (modalTitle) {

        modalTitle.textContent =
            event.Name || "Untitled Event";
    }


    /* -----------------------------------------------------
       DATE
    ----------------------------------------------------- */

    if (modalDate) {

        modalDate.textContent =
            formatFullDate(event.Date);
    }


    /* -----------------------------------------------------
       HASHTAG
    ----------------------------------------------------- */

    if (modalHashtag) {

        modalHashtag.textContent =
            Array.isArray(event.Hashtag)
                ? event.Hashtag.join(", ")
                : event.Hashtag || "—";
    }


    /* -----------------------------------------------------
       KW
    ----------------------------------------------------- */

    if (modalKW) {

        modalKW.textContent =
            Array.isArray(event.KW)
                ? event.KW.join(", ")
                : event.KW || "—";
    }


    /* -----------------------------------------------------
       LOCATION
    ----------------------------------------------------- */

    if (modalLocation) {

        modalLocation.textContent =
            event.Location || "—";
    }


    /* -----------------------------------------------------
       IMAGE
    ----------------------------------------------------- */

    if (modalImage) {

        if (event.Image) {

            modalImage.innerHTML = `
                <img
                    src="${escapeHTML(event.Image)}"
                    alt="${escapeHTML(
                        event.Name || "Event"
                    )}"
                >
            `;

        } else {

            modalImage.innerHTML = `
                <div class="event-image-placeholder">
                    NF
                </div>
            `;
        }
    }


    /* -----------------------------------------------------
       RELATED LINK
    ----------------------------------------------------- */

    if (modalLink) {

        if (event.Link) {

            modalLink.href = event.Link;

            modalLink.classList.remove("hidden");

        } else {

            modalLink.href = "#";

            modalLink.classList.add("hidden");
        }
    }


    /* -----------------------------------------------------
       SHOW MODAL
    ----------------------------------------------------- */

    eventModal.classList.add("active");

    document.body.classList.add("modal-open");
}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (!eventModal) {
        return;
    }

    eventModal.classList.remove("active");

    document.body.classList.remove("modal-open");
}


/* =========================================================
   INSTAGRAM FEEDS
========================================================= */

async function loadInstagramFeeds() {

    for (
        const account
        of INSTAGRAM_ACCOUNTS
    ) {

        try {

            await loadInstagramAccount(
                account
            );

        } catch (error) {

            console.error(
                `Instagram error: ${account.key}`,
                error
            );
        }
    }
}


/* =========================================================
   LOAD INSTAGRAM ACCOUNT
========================================================= */

async function loadInstagramAccount(
    account
) {

    const container =
        document.getElementById(
            account.elementId
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                `${INSTAGRAM_API_URL}?username=${encodeURIComponent(
                    account.username.replace(
                        "@",
                        ""
                    )
                )}`,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        const posts =
            Array.isArray(
                data
            )
                ? data
                : data.posts ||
                  data.data ||
                  [];


        renderInstagramPosts(
            container,
            posts.slice(
                0,
                INSTAGRAM_POST_LIMIT
            )
        );


    } catch (error) {

        console.error(
            "Failed to load Instagram:",
            error
        );


        container.innerHTML = "";
    }
}


/* =========================================================
   RENDER INSTAGRAM POSTS
========================================================= */

function renderInstagramPosts(
    container,
    posts
) {

    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !Array.isArray(
            posts
        ) ||
        posts.length === 0
    ) {

        return;
    }


    posts.forEach(
        post => {

            const item =
                document.createElement(
                    "a"
                );


            item.className =
                "instagram-item";


            item.href =
                post.permalink ||
                post.url ||
                "#";


            item.target =
                "_blank";


            item.rel =
                "noopener noreferrer";


            const image =
                post.thumbnail_url ||
                post.media_url ||
                post.image ||
                post.image_url ||
                "";


            if (image) {

                item.innerHTML = `
                    <img
                        src="${escapeHTML(
                            image
                        )}"
                        alt=""
                        loading="lazy"
                    >
                `;

            } else {

                item.innerHTML = `
                    <div
                        class="instagram-placeholder"
                    >
                        Instagram
                    </div>
                `;
            }


            container.appendChild(
                item
            );
        }
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}
