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
        Location: "Ang Thong Patthamarot Witthayakhom School, Ang Thong",
        NAMTANFILM: "FILM",
        Type: "Event",
        Year: 2025
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
   INSTAGRAM
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
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    init();
});


/* =========================================================
   INITIALIZE
========================================================= */

async function init() {
    await loadEvents();

    setupFilters();
    updateStats();
    renderUpcoming();
    renderCalendar();

    setupProfileTabs();
    setupEventControls();

    setupModal();
    setupMediaLightbox();

    loadInstagram();
}


/* =========================================================
   LOAD EVENTS
========================================================= */

async function loadEvents() {
    try {
        const response = await fetch("./data/events");

        if (!response.ok) {
            throw new Error(
                `Failed to load events: ${response.status}`
            );
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            events = data;
        } else if (Array.isArray(data.events)) {
            events = data.events;
        } else if (Array.isArray(data.results)) {
            events = data.results;
        } else {
            events = [];
        }

    } catch (error) {
        console.error("Unable to load events:", error);

        events = [...SAMPLE_EVENTS];
    }

    filteredEvents = [...events];

    renderEvents();
}


/* =========================================================
   EVENT FILTERS
========================================================= */

function setupFilters() {
    const searchInput =
        document.querySelector("#eventSearch");

    const yearFilter =
        document.querySelector("#yearFilter");

    const typeFilter =
        document.querySelector("#typeFilter");

    const personFilter =
        document.querySelector("#personFilter");

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            applyFilters
        );
    }

    if (yearFilter) {
        yearFilter.addEventListener(
            "change",
            applyFilters
        );
    }

    if (typeFilter) {
        typeFilter.addEventListener(
            "change",
            applyFilters
        );
    }

    if (personFilter) {
        personFilter.addEventListener(
            "change",
            applyFilters
        );
    }

    populateFilterOptions();
}


function populateFilterOptions() {
    const yearFilter =
        document.querySelector("#yearFilter");

    const typeFilter =
        document.querySelector("#typeFilter");

    const personFilter =
        document.querySelector("#personFilter");

    if (yearFilter) {
        const years = [
            ...new Set(
                events
                    .map(event => event.Year)
                    .filter(Boolean)
            )
        ]
            .sort((a, b) => Number(b) - Number(a));

        yearFilter.innerHTML =
            `<option value="">All Years</option>` +
            years
                .map(
                    year =>
                        `<option value="${escapeHTML(
                            String(year)
                        )}">${escapeHTML(
                            String(year)
                        )}</option>`
                )
                .join("");
    }

    if (typeFilter) {
        const types = [
            ...new Set(
                events
                    .map(event => event.Type)
                    .filter(Boolean)
            )
        ].sort();

        typeFilter.innerHTML =
            `<option value="">All Types</option>` +
            types
                .map(
                    type =>
                        `<option value="${escapeHTML(
                            String(type)
                        )}">${escapeHTML(
                            String(type)
                        )}</option>`
                )
                .join("");
    }

    if (personFilter) {
        const people = [
            ...new Set(
                events
                    .map(event => event.NAMTANFILM)
                    .filter(Boolean)
            )
        ].sort();

        personFilter.innerHTML =
            `<option value="">All</option>` +
            people
                .map(
                    person =>
                        `<option value="${escapeHTML(
                            String(person)
                        )}">${escapeHTML(
                            String(person)
                        )}</option>`
                )
                .join("");
    }
}


function applyFilters() {
    const searchInput =
        document.querySelector("#eventSearch");

    const yearFilter =
        document.querySelector("#yearFilter");

    const typeFilter =
        document.querySelector("#typeFilter");

    const personFilter =
        document.querySelector("#personFilter");

    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const year =
        yearFilter
            ? yearFilter.value
            : "";

    const type =
        typeFilter
            ? typeFilter.value
            : "";

    const person =
        personFilter
            ? personFilter.value
            : "";

    filteredEvents = events.filter(event => {

        const text = [
            event.Name,
            event.Date,
            event.Hashtag,
            event.KW,
            event.Location,
            event.NAMTANFILM,
            event.Type,
            event.Year
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !search ||
            text.includes(search);

        const matchesYear =
            !year ||
            String(event.Year) === String(year);

        const matchesType =
            !type ||
            String(event.Type) === String(type);

        const matchesPerson =
            !person ||
            String(event.NAMTANFILM) ===
            String(person);

        return (
            matchesSearch &&
            matchesYear &&
            matchesType &&
            matchesPerson
        );
    });

    currentPage = 1;

    renderEvents();
}


/* =========================================================
   EVENT CONTROLS
========================================================= */

function setupEventControls() {
    const prevButton =
        document.querySelector("#prevPage");

    const nextButton =
        document.querySelector("#nextPage");

    if (prevButton) {
        prevButton.addEventListener(
            "click",
            () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderEvents();
                    scrollToEvents();
                }
            }
        );
    }

    if (nextButton) {
        nextButton.addEventListener(
            "click",
            () => {
                const totalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            filteredEvents.length /
                            PAGE_SIZE
                        )
                    );

                if (currentPage < totalPages) {
                    currentPage++;
                    renderEvents();
                    scrollToEvents();
                }
            }
        );
    }
}


function scrollToEvents() {
    const grid =
        document.querySelector("#eventsGrid");

    if (grid) {
        grid.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


/* =========================================================
   RENDER EVENTS
========================================================= */

function renderEvents() {
    const grid =
        document.querySelector("#eventsGrid") ||
        document.querySelector(".events-grid");

    if (!grid) {
        return;
    }

    const start =
        (currentPage - 1) * PAGE_SIZE;

    const end =
        start + PAGE_SIZE;

    const pageEvents =
        filteredEvents.slice(
            start,
            end
        );

    if (!pageEvents.length) {
        grid.innerHTML = `
            <div class="empty-state">
                No events found.
            </div>
        `;

        updatePagination();

        return;
    }

    grid.innerHTML =
        pageEvents
            .map(
                event =>
                    createEventCard(event)
            )
            .join("");

    grid
        .querySelectorAll(".event-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            card.dataset.index
                        );

                    const event =
                        pageEvents[index];

                    if (event) {
                        openModal(event);
                    }
                }
            );
        });

    updatePagination();
}


function createEventCard(event) {

    const image =
        event.Image ||
        event.image ||
        event.Cover ||
        event.cover ||
        "";

    const title =
        event.Name ||
        "Untitled Event";

    const date =
        event.Date ||
        "";

    const person =
        event.NAMTANFILM ||
        "";

    const type =
        event.Type ||
        "";

    const location =
        event.Location ||
        "";

    const imageHTML =
        image
            ? `
                <div class="event-card-image">
                    <img
                        src="${escapeAttribute(
                            image
                        )}"
                        alt="${escapeAttribute(
                            title
                        )}"
                        loading="lazy"
                    >
                </div>
            `
            : `
                <div class="event-card-image event-card-image-empty">
                    <span>FROM PLUTO</span>
                </div>
            `;

    return `
        <article
            class="event-card"
            data-index="${filteredEvents
                .slice(
                    (currentPage - 1) *
                    PAGE_SIZE,
                    currentPage *
                    PAGE_SIZE
                )
                .indexOf(event)}"
        >

            ${imageHTML}

            <div class="event-card-content">

                ${
                    person
                        ? `
                            <div class="event-card-person">
                                ${escapeHTML(
                                    person
                                )}
                            </div>
                        `
                        : ""
                }

                <h3 class="event-card-title">
                    ${escapeHTML(title)}
                </h3>

                ${
                    date
                        ? `
                            <div class="event-card-date">
                                ${escapeHTML(
                                    date
                                )}
                            </div>
                        `
                        : ""
                }

                ${
                    type
                        ? `
                            <div class="event-card-type">
                                ${escapeHTML(
                                    type
                                )}
                            </div>
                        `
                        : ""
                }

                ${
                    location
                        ? `
                            <div class="event-card-location">
                                ${escapeHTML(
                                    location
                                )}
                            </div>
                        `
                        : ""
                }

            </div>

        </article>
    `;
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

    const pageNumber =
        document.querySelector("#pageNumber");

    const pageInfo =
        document.querySelector("#pageInfo");

    const prevButton =
        document.querySelector("#prevPage");

    const nextButton =
        document.querySelector("#nextPage");

    if (pageNumber) {
        pageNumber.textContent =
            `${currentPage} / ${totalPages}`;
    }

    if (pageInfo) {
        pageInfo.textContent =
            `Page ${currentPage} of ${totalPages}`;
    }

    if (prevButton) {
        prevButton.disabled =
            currentPage <= 1;
    }

    if (nextButton) {
        nextButton.disabled =
            currentPage >= totalPages;
    }
}


/* =========================================================
   STATS
========================================================= */

function updateStats() {

    const totalEvents =
        document.querySelector("#totalEvents");

    const totalYears =
        document.querySelector("#totalYears");

    const totalNamtanFilm =
        document.querySelector(
            "#totalNamtanFilm"
        );

    const totalTypes =
        document.querySelector("#totalTypes");

    if (totalEvents) {
        totalEvents.textContent =
            events.length;
    }

    if (totalYears) {
        totalYears.textContent =
            new Set(
                events
                    .map(event => event.Year)
                    .filter(Boolean)
            ).size;
    }

    if (totalNamtanFilm) {
        totalNamtanFilm.textContent =
            new Set(
                events
                    .map(
                        event =>
                            event.NAMTANFILM
                    )
                    .filter(Boolean)
            ).size;
    }

    if (totalTypes) {
        totalTypes.textContent =
            new Set(
                events
                    .map(event => event.Type)
                    .filter(Boolean)
            ).size;
    }
}


/* =========================================================
   UPCOMING EVENTS
========================================================= */

function renderUpcoming() {

    const container =
        document.querySelector(
            "#upcomingEvents"
        );

    if (!container) {
        return;
    }

    const today =
        new Date();

    const upcoming =
        events
            .map(event => ({
                event,
                date: parseEventDate(
                    event.Date
                )
            }))
            .filter(item =>
                item.date &&
                item.date >= today
            )
            .sort(
                (a, b) =>
                    a.date - b.date
            )
            .slice(0, 6);

    if (!upcoming.length) {
        container.innerHTML = `
            <div class="empty-state">
                No upcoming events.
            </div>
        `;

        return;
    }

    container.innerHTML =
        upcoming
            .map(item =>
                createUpcomingCard(
                    item.event
                )
            )
            .join("");

    container
        .querySelectorAll(".upcoming-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const eventIndex =
                        Number(
                            card.dataset.eventIndex
                        );

                    const event =
                        events[eventIndex];

                    if (event) {
                        openModal(event);
                    }
                }
            );
        });
}


function createUpcomingCard(event) {

    const index =
        events.indexOf(event);

    return `
        <article
            class="upcoming-card"
            data-event-index="${index}"
        >

            <div class="upcoming-date">
                ${escapeHTML(
                    event.Date || ""
                )}
            </div>

            <h3>
                ${escapeHTML(
                    event.Name ||
                    "Untitled Event"
                )}
            </h3>

            ${
                event.Location
                    ? `
                        <div class="upcoming-location">
                            ${escapeHTML(
                                event.Location
                            )}
                        </div>
                    `
                    : ""
            }

        </article>
    `;
}


/* =========================================================
   CALENDAR
========================================================= */

function renderCalendar() {

    const container =
        document.querySelector(
            "#calendar"
        );

    if (!container) {
        return;
    }

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        now.getMonth();

    const firstDay =
        new Date(
            year,
            month,
            1
        );

    const lastDay =
        new Date(
            year,
            month + 1,
            0
        );

    const startWeekday =
        firstDay.getDay();

    const days =
        lastDay.getDate();

    const eventDates =
        {};

    events.forEach(event => {

        const date =
            parseEventDate(
                event.Date
            );

        if (!date) {
            return;
        }

        if (
            date.getFullYear() === year &&
            date.getMonth() === month
        ) {

            const day =
                date.getDate();

            if (!eventDates[day]) {
                eventDates[day] = [];
            }

            eventDates[day].push(
                event
            );
        }
    });

    let html = "";

    html += `
        <div class="calendar-header">
            ${[
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat"
            ]
                .map(
                    day =>
                        `<div>${day}</div>`
                )
                .join("")}
        </div>
    `;

    html += `
        <div class="calendar-grid">
    `;

    for (
        let i = 0;
        i < startWeekday;
        i++
    ) {
        html += `
            <div class="calendar-day empty"></div>
        `;
    }

    for (
        let day = 1;
        day <= days;
        day++
    ) {

        const dayEvents =
            eventDates[day] || [];

        html += `
            <div
                class="calendar-day ${
                    dayEvents.length
                        ? "has-event"
                        : ""
                }"
                data-day="${day}"
            >

                <div class="calendar-day-number">
                    ${day}
                </div>

                ${
                    dayEvents.length
                        ? `
                            <div class="calendar-event-dot">
                                ${dayEvents.length}
                            </div>
                        `
                        : ""
                }

            </div>
        `;
    }

    html += `
        </div>
    `;

    container.innerHTML = html;

    container
        .querySelectorAll(
            ".calendar-day.has-event"
        )
        .forEach(dayElement => {

            dayElement.addEventListener(
                "click",
                () => {

                    const day =
                        Number(
                            dayElement.dataset.day
                        );

                    const selected =
                        eventDates[day];

                    if (
                        selected &&
                        selected.length
                    ) {
                        openModal(
                            selected[0]
                        );
                    }
                }
            );
        });
}


/* =========================================================
   PROFILE TABS
========================================================= */

function setupProfileTabs() {

    const tabs =
        document.querySelectorAll(
            ".profile-tab"
        );

    const panels =
        document.querySelectorAll(
            ".profile-panel"
        );

    if (!tabs.length) {
        return;
    }

    tabs.forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                const target =
                    tab.dataset.tab;

                tabs.forEach(item =>
                    item.classList.remove(
                        "active"
                    )
                );

                panels.forEach(panel =>
                    panel.classList.remove(
                        "active"
                    )
                );

                tab.classList.add(
                    "active"
                );

                const panel =
                    document.querySelector(
                        `#${target}`
                    );

                if (panel) {
                    panel.classList.add(
                        "active"
                    );
                }
            }
        );
    });
}


/* =========================================================
   MODAL
========================================================= */

let activeModal = null;


function setupModal() {

    activeModal =
        document.querySelector(
            "#eventModal"
        );

    if (!activeModal) {
        return;
    }

    const closeButtons =
        activeModal.querySelectorAll(
            ".modal-close, [data-close-modal]"
        );

    closeButtons.forEach(button => {

        button.addEventListener(
            "click",
            closeModal
        );
    });

    activeModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                activeModal
            ) {
                closeModal();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                activeModal.classList.contains(
                    "active"
                )
            ) {
                closeModal();
            }
        }
    );
}


/* =========================================================
   OPEN EVENT MODAL
========================================================= */

async function openModal(event) {

    if (!activeModal) {
        activeModal =
            document.querySelector(
                "#eventModal"
            );
    }

    if (!activeModal) {
        return;
    }

    const artist =
        activeModal.querySelector(
            "#modalArtist"
        );

    const type =
        activeModal.querySelector(
            "#modalType"
        );

    const title =
        activeModal.querySelector(
            "#modalTitle"
        );

    const date =
        activeModal.querySelector(
            "#modalDate"
        );

    const hashtag =
        activeModal.querySelector(
            "#modalHashtag"
        );

    const kw =
        activeModal.querySelector(
            "#modalKW"
        );

    const location =
        activeModal.querySelector(
            "#modalLocation"
        );

    const image =
        activeModal.querySelector(
            "#modalImage"
        );

    const link =
        activeModal.querySelector(
            "#modalLink"
        );

    const description =
        activeModal.querySelector(
            "#modalDescription"
        );


    /* -----------------------------------------
       BASIC INFO
    ----------------------------------------- */

    if (artist) {
        artist.textContent =
            event.NAMTANFILM ||
            "";
    }

    if (type) {
        type.textContent =
            event.Type ||
            "";
    }

    if (title) {
        title.textContent =
            event.Name ||
            "Untitled Event";
    }

    if (date) {
        date.textContent =
            event.Date ||
            "";
    }

    if (hashtag) {
        hashtag.textContent =
            event.Hashtag ||
            "";
    }

    if (kw) {
        kw.textContent =
            event.KW ||
            "";
    }

    if (location) {
        location.textContent =
            event.Location ||
            "";
    }


    /* -----------------------------------------
       IMAGE
    ----------------------------------------- */

    const eventImage =
        event.Image ||
        event.image ||
        event.Cover ||
        event.cover ||
        "";

    if (image) {

        if (eventImage) {

            image.src =
                eventImage;

            image.alt =
                event.Name ||
                "";

            image.style.display =
                "block";

        } else {

            image.removeAttribute(
                "src"
            );

            image.style.display =
                "none";
        }
    }


    /* -----------------------------------------
       LINK
    ----------------------------------------- */

    if (link) {

        if (event.Link) {

            link.href =
                event.Link;

            link.style.display =
                "";

        } else if (event.URL) {

            link.href =
                event.URL;

            link.style.display =
                "";

        } else {

            link.removeAttribute(
                "href"
            );

            link.style.display =
                "none";
        }
    }


    /* -----------------------------------------
       LOADING
    ----------------------------------------- */

    if (description) {

        description.innerHTML = `
            <div class="modal-description-loading">
                Loading event details...
            </div>
        `;
    }


    /* -----------------------------------------
       SHOW MODAL
    ----------------------------------------- */

    activeModal.classList.add(
        "active"
    );

    document.body.classList.add(
        "modal-open"
    );


    /* -----------------------------------------
       LOAD NOTION CONTENT
    ----------------------------------------- */

    if (
        event.PageID &&
        description
    ) {

        try {

            const response =
                await fetch(
                    `./data/content/${encodeURIComponent(
                        event.PageID
                    )}`
                );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const data =
                await response.json();

            if (
                data &&
                typeof data.content ===
                "string"
            ) {

                description.innerHTML =
                    data.content;

                /*
                 * IMPORTANT:
                 * Notion content is already
                 * retrieved correctly.
                 *
                 * Now convert the media
                 * into the Masonry layout.
                 */

                setupNotionMasonry(
                    description
                );

            } else {

                description.innerHTML = `
                    <div class="modal-description-loading">
                        No additional content.
                    </div>
                `;
            }

        } catch (error) {

            console.error(
                "Unable to load event details:",
                error
            );

            description.innerHTML = `
                <div class="modal-description-loading">
                    Unable to load event details.
                </div>
            `;
        }

    } else if (description) {

        description.innerHTML = `
            <div class="modal-description-loading">
                No additional content.
            </div>
        `;
    }
}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (!activeModal) {
        return;
    }

    activeModal.classList.remove(
        "active"
    );

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   NOTION MASONRY
========================================================= */

/*
   This does NOT change the Notion API.

   It only changes the way the already-retrieved
   Notion media is arranged on the page.

   Desktop  = 4 columns
   Mobile   = 3 columns

   Unlike CSS columns, this method:
   - keeps each media item intact
   - uses actual column height
   - places new items into the shortest column
   - recalculates after images/videos load
*/


let masonryResizeTimer = null;


function setupNotionMasonry(container) {

    if (!container) {
        return;
    }

    /*
     * Find existing media grid first.
     */
    let grid =
        container.querySelector(
            ".notion-media-grid"
        );


    /*
     * If Worker returned column-based
     * Notion HTML, flatten the media blocks
     * into one media grid.
     */
    if (!grid) {

        const columnList =
            container.querySelector(
                ".notion-column-list"
            );

        if (columnList) {

            const items =
                Array.from(
                    columnList.querySelectorAll(
                        ".notion-media-item, .notion-image-item"
                    )
                );

            if (items.length) {

                grid =
                    document.createElement(
                        "div"
                    );

                grid.className =
                    "notion-media-grid";

                items.forEach(item => {
                    grid.appendChild(item);
                });

                columnList.replaceWith(
                    grid
                );
            }
        }
    }


    /*
     * Still no grid?
     */
    if (!grid) {

        /*
         * Some versions may return the
         * media blocks directly.
         */
        const directItems =
            Array.from(
                container.querySelectorAll(
                    ".notion-media-item, .notion-image-item"
                )
            );

        if (!directItems.length) {
            return;
        }

        grid =
            document.createElement(
                "div"
            );

        grid.className =
            "notion-media-grid";

        directItems.forEach(item => {
            grid.appendChild(item);
        });
    }


    /*
     * Get the original media items.
     *
     * Only direct children are used after
     * normalization.
     */
    let items =
        Array.from(
            grid.children
        ).filter(item =>
            item.matches(
                ".notion-media-item, .notion-image-item"
            )
        );


    if (!items.length) {

        items =
            Array.from(
                grid.querySelectorAll(
                    ".notion-media-item, .notion-image-item"
                )
            );

        items.forEach(item => {

            if (
                item.parentElement !== grid
            ) {
                grid.appendChild(item);
            }
        });
    }


    if (!items.length) {
        return;
    }


    /*
     * Prevent duplicate initialization.
     */
    if (!grid._masonryItems) {
        grid._masonryItems =
            items.slice();
    } else {
        items =
            grid._masonryItems.slice();
    }


    /*
     * Render immediately.
     */
    renderNotionMasonry(
        grid,
        items
    );


    /*
     * Re-render whenever an image finishes
     * loading because its real height may
     * not be known during the first render.
     */
    items.forEach(item => {

        const images =
            item.querySelectorAll(
                "img"
            );

        images.forEach(img => {

            if (
                img.dataset.masonryBound
            ) {
                return;
            }

            img.dataset.masonryBound =
                "1";

            img.addEventListener(
                "load",
                () => {
                    renderNotionMasonry(
                        grid,
                        items
                    );
                }
            );
        });


        const videos =
            item.querySelectorAll(
                "video"
            );

        videos.forEach(video => {

            if (
                video.dataset.masonryBound
            ) {
                return;
            }

            video.dataset.masonryBound =
                "1";

            video.addEventListener(
                "loadedmetadata",
                () => {
                    renderNotionMasonry(
                        grid,
                        items
                    );
                }
            );
        });
    });


    /*
     * Resize handling.
     */
    if (!grid._masonryResizeBound) {

        grid._masonryResizeBound =
            true;

        window.addEventListener(
            "resize",
            () => {

                clearTimeout(
                    masonryResizeTimer
                );

                masonryResizeTimer =
                    setTimeout(
                        () => {

                            if (
                                document.body.contains(
                                    grid
                                )
                            ) {

                                renderNotionMasonry(
                                    grid,
                                    items
                                );
                            }

                        },
                        150
                    );
            }
        );
    }
}


/* =========================================================
   RENDER MASONRY
========================================================= */

function renderNotionMasonry(
    grid,
    items
) {

    if (
        !grid ||
        !items ||
        !items.length
    ) {
        return;
    }


    /*
     * Number of columns:
     *
     * Desktop: 4
     * Mobile: 3
     */
    const columnCount =
        window.innerWidth <= 700
            ? 3
            : 4;


    /*
     * Save original item list.
     */
    grid._masonryItems =
        items.slice();


    /*
     * Remove old masonry columns.
     *
     * The actual media items are first
     * recovered from the columns.
     */
    const existingColumns =
        Array.from(
            grid.querySelectorAll(
                ":scope > .notion-masonry-column"
            )
        );


    if (existingColumns.length) {

        const recovered = [];

        existingColumns.forEach(
            column => {

                Array.from(
                    column.children
                ).forEach(item => {

                    if (
                        item.matches(
                            ".notion-media-item, .notion-image-item"
                        )
                    ) {
                        recovered.push(
                            item
                        );
                    }
                });
            }
        );

        if (recovered.length) {
            items =
                grid._masonryItems =
                    recovered;
        }
    }


    /*
     * Clear grid.
     */
    grid.innerHTML = "";


    /*
     * Create columns.
     */
    const columns = [];

    for (
        let i = 0;
        i < columnCount;
        i++
    ) {

        const column =
            document.createElement(
                "div"
            );

        column.className =
            "notion-masonry-column";

        grid.appendChild(
            column
        );

        columns.push(
            column
        );
    }


    /*
     * Place every item into the
     * currently shortest column.
     *
     * This creates real Masonry behavior
     * instead of normal row-based CSS Grid.
     */
    items.forEach(item => {

        let shortestColumn =
            columns[0];

        let shortestHeight =
            getColumnHeight(
                shortestColumn
            );

        for (
            let i = 1;
            i < columns.length;
            i++
        ) {

            const height =
                getColumnHeight(
                    columns[i]
                );

            if (
                height <
                shortestHeight
            ) {

                shortestColumn =
                    columns[i];

                shortestHeight =
                    height;
            }
        }

        shortestColumn.appendChild(
            item
        );
    });


    /*
     * Force the correct CSS class.
     */
    grid.classList.add(
        "notion-masonry-active"
    );
}


/* =========================================================
   COLUMN HEIGHT
========================================================= */

function getColumnHeight(
    column
) {

    if (!column) {
        return 0;
    }

    return column.getBoundingClientRect()
        .height;
}


/* =========================================================
   MEDIA LIGHTBOX
========================================================= */

let lightboxImages = [];
let lightboxIndex = 0;

let mediaLightbox = null;
let mediaLightboxImage = null;
let mediaLightboxCounter = null;


/* =========================================================
   SETUP MEDIA LIGHTBOX
========================================================= */

function setupMediaLightbox() {

    /*
     * Create lightbox only once.
     */
    createMediaLightbox();


    /*
     * Event delegation.
     *
     * Supports both:
     *
     * .notion-media-item img
     * .notion-image-item img
     */
    document.addEventListener(
        "click",
        event => {

            const image =
                event.target.closest(
                    ".notion-media-item img, .notion-image-item img"
                );

            if (!image) {
                return;
            }

            const container =
                image.closest(
                    ".modal-description"
                );

            if (!container) {
                return;
            }


            const images =
                Array.from(
                    container.querySelectorAll(
                        ".notion-media-item img, .notion-image-item img"
                    )
                );


            if (!images.length) {
                return;
            }


            lightboxImages =
                images.map(img => ({
                    src:
                        img.currentSrc ||
                        img.src,

                    alt:
                        img.alt ||
                        ""
                }));


            lightboxIndex =
                Math.max(
                    0,
                    images.indexOf(image)
                );


            openMediaLightbox(
                lightboxImages[
                    lightboxIndex
                ],
                lightboxIndex
            );
        }
    );
}


/* =========================================================
   CREATE LIGHTBOX
========================================================= */

function createMediaLightbox() {

    if (
        document.querySelector(
            "#mediaLightbox"
        )
    ) {

        mediaLightbox =
            document.querySelector(
                "#mediaLightbox"
            );

        mediaLightboxImage =
            mediaLightbox.querySelector(
                ".media-lightbox-content img"
            );

        mediaLightboxCounter =
            mediaLightbox.querySelector(
                ".media-lightbox-counter"
            );

        return;
    }


    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.id =
        "mediaLightbox";

    wrapper.className =
        "media-lightbox";


    wrapper.innerHTML = `

        <button
            type="button"
            class="media-lightbox-close"
            aria-label="Close"
        >
            ×
        </button>

        <button
            type="button"
            class="media-lightbox-prev"
            aria-label="Previous"
        >
            ‹
        </button>

        <div class="media-lightbox-content">

            <img
                src=""
                alt=""
            >

        </div>

        <button
            type="button"
            class="media-lightbox-next"
            aria-label="Next"
        >
            ›
        </button>

        <div
            class="media-lightbox-counter"
        ></div>

    `;


    document.body.appendChild(
        wrapper
    );


    mediaLightbox =
        wrapper;

    mediaLightboxImage =
        wrapper.querySelector(
            ".media-lightbox-content img"
        );

    mediaLightboxCounter =
        wrapper.querySelector(
            ".media-lightbox-counter"
        );


    const closeButton =
        wrapper.querySelector(
            ".media-lightbox-close"
        );

    const prevButton =
        wrapper.querySelector(
            ".media-lightbox-prev"
        );

    const nextButton =
        wrapper.querySelector(
            ".media-lightbox-next"
        );


    closeButton.addEventListener(
        "click",
        closeMediaLightbox
    );

    prevButton.addEventListener(
        "click",
        () => {
            showPreviousLightboxImage();
        }
    );

    nextButton.addEventListener(
        "click",
        () => {
            showNextLightboxImage();
        }
    );


    wrapper.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                wrapper
            ) {
                closeMediaLightbox();
            }
        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                !mediaLightbox ||
                !mediaLightbox.classList.contains(
                    "active"
                )
            ) {
                return;
            }

            if (
                event.key ===
                "Escape"
            ) {
                closeMediaLightbox();
            }

            if (
                event.key ===
                "ArrowLeft"
            ) {
                showPreviousLightboxImage();
            }

            if (
                event.key ===
                "ArrowRight"
            ) {
                showNextLightboxImage();
            }
        }
    );
}


/* =========================================================
   OPEN LIGHTBOX
========================================================= */

function openMediaLightbox(
    imageData,
    index
) {

    if (!mediaLightbox) {
        createMediaLightbox();
    }

    if (!imageData) {
        return;
    }

    lightboxIndex =
        index || 0;


    mediaLightboxImage.src =
        imageData.src;

    mediaLightboxImage.alt =
        imageData.alt ||
        "";


    updateLightboxCounter();


    mediaLightbox.classList.add(
        "active"
    );

    document.body.classList.add(
        "lightbox-open"
    );
}


/* =========================================================
   CLOSE LIGHTBOX
========================================================= */

function closeMediaLightbox() {

    if (!mediaLightbox) {
        return;
    }

    mediaLightbox.classList.remove(
        "active"
    );

    document.body.classList.remove(
        "lightbox-open"
    );
}


/* =========================================================
   PREVIOUS
========================================================= */

function showPreviousLightboxImage() {

    if (
        !lightboxImages.length
    ) {
        return;
    }

    lightboxIndex =
        (
            lightboxIndex -
            1 +
            lightboxImages.length
        ) %
        lightboxImages.length;

    updateLightboxImage();
}


/* =========================================================
   NEXT
========================================================= */

function showNextLightboxImage() {

    if (
        !lightboxImages.length
    ) {
        return;
    }

    lightboxIndex =
        (
            lightboxIndex +
            1
        ) %
        lightboxImages.length;

    updateLightboxImage();
}


/* =========================================================
   UPDATE LIGHTBOX IMAGE
========================================================= */

function updateLightboxImage() {

    const imageData =
        lightboxImages[
            lightboxIndex
        ];

    if (!imageData) {
        return;
    }

    mediaLightboxImage.src =
        imageData.src;

    mediaLightboxImage.alt =
        imageData.alt ||
        "";

    updateLightboxCounter();
}


/* =========================================================
   LIGHTBOX COUNTER
========================================================= */

function updateLightboxCounter() {

    if (!mediaLightboxCounter) {
        return;
    }

    if (
        lightboxImages.length <= 1
    ) {

        mediaLightboxCounter.textContent =
            "";

        return;
    }

    mediaLightboxCounter.textContent =
        `${lightboxIndex + 1} / ${
            lightboxImages.length
        }`;
}


/* =========================================================
   INSTAGRAM
========================================================= */

async function loadInstagram() {

    for (
        const account
        of INSTAGRAM_ACCOUNTS
    ) {

        await loadInstagramAccount(
            account
        );
    }
}


/* =========================================================
   LOAD ONE INSTAGRAM ACCOUNT
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

        const url =
            `${INSTAGRAM_API_URL}?username=${encodeURIComponent(
                account.username
            )}&limit=${INSTAGRAM_POST_LIMIT}`;

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Instagram API returned ${response.status}`
            );
        }

        const data =
            await response.json();

        const posts =
            Array.isArray(data)
                ? data
                : Array.isArray(
                    data.posts
                )
                    ? data.posts
                    : Array.isArray(
                        data.data
                    )
                        ? data.data
                        : [];

        renderInstagramPosts(
            container,
            posts
        );

    } catch (error) {

        console.error(
            `Instagram error for ${account.username}:`,
            error
        );

        container.innerHTML = `
            <div class="instagram-empty">
                Unable to load Instagram posts.
            </div>
        `;
    }
}


/* =========================================================
   RENDER INSTAGRAM POSTS
========================================================= */

function renderInstagramPosts(
    container,
    posts
) {

    if (!posts.length) {

        container.innerHTML = `
            <div class="instagram-empty">
                No Instagram posts available.
            </div>
        `;

        return;
    }


    container.innerHTML =
        posts
            .slice(
                0,
                INSTAGRAM_POST_LIMIT
            )
            .map(
                post =>
                    createInstagramPost(
                        post
                    )
            )
            .join("");
}


/* =========================================================
   INSTAGRAM POST CARD
========================================================= */

function createInstagramPost(
    post
) {

    const image =
        post.image ||
        post.thumbnail ||
        post.display_url ||
        post.displayUrl ||
        "";

    const url =
        post.url ||
        post.permalink ||
        post.link ||
        "#";

    const caption =
        post.caption ||
        "";


    return `
        <a
            class="instagram-post"
            href="${escapeAttribute(
                url
            )}"
            target="_blank"
            rel="noopener noreferrer"
        >

            ${
                image
                    ? `
                        <img
                            src="${escapeAttribute(
                                image
                            )}"
                            alt="${escapeAttribute(
                                caption
                            )}"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="instagram-post-empty">
                            Instagram
                        </div>
                    `
            }

        </a>
    `;
}


/* =========================================================
   DATE PARSER
========================================================= */

function parseEventDate(
    value
) {

    if (!value) {
        return null;
    }


    if (
        value instanceof Date
    ) {
        return isNaN(
            value.getTime()
        )
            ? null
            : value;
    }


    const parsed =
        new Date(value);


    if (
        !isNaN(
            parsed.getTime()
        )
    ) {
        return parsed;
    }


    /*
     * Try common formats.
     */
    const match =
        String(value).match(
            /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
        );

    if (match) {

        const month =
            Number(match[1]) - 1;

        const day =
            Number(match[2]);

        const year =
            Number(match[3]);

        const date =
            new Date(
                year,
                month,
                day
            );

        return isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    return null;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
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


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );
}
