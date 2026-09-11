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
   INSTAGRAM CONFIG
   ========================================================= */

/*
    IMPORTANT

    Do NOT put Instagram access tokens in this file.

    GitHub Pages is frontend-only.

    The recommended structure is:

        GitHub Pages
              ↓
        Cloudflare Worker
              ↓
        Instagram API

    Change this URL later when your Cloudflare Worker
    is ready.
*/

const INSTAGRAM_API_URL = "./api/instagram";


/*
    Instagram accounts

    These IDs match the HTML IDs that you already added
    to index.html.
*/

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


/*
    Number of posts to display per account.

    The backend can return more posts.
    The horizontal container will allow scrolling.
*/

const INSTAGRAM_POST_LIMIT = 20;


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

    /*
        Load Event Archive
    */

    await loadEvents();


    /*
        Setup filters
    */

    setupFilters();


    /*
        Update statistics
    */

    updateStats();


    /*
        Render events
    */

    applyFilters();


    /*
        Setup event listeners
    */

    setupEvents();


    /*
        Load Instagram

        This runs independently from the Event Archive.

        If Instagram fails, the Event Archive will
        continue working normally.
    */

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
                "Unable to load /api/events"
            );

        }


        const data =
            await response.json();


        if (!Array.isArray(data)) {

            throw new Error(
                "/api/events must return an array"
            );

        }


        events = data;

    } catch (error) {

        console.warn(
            "/api/events could not be loaded. Using sample data.",
            error
        );

        events = SAMPLE_EVENTS;

    }


    /*
        Remove events without dates
        and sort newest first.
    */

    events = events

        .filter(
            event => event.Date
        )

        .sort(
            (a, b) => {

                return (
                    parseEventDate(b.Date) -
                    parseEventDate(a.Date)
                );

            }
        );


    filteredEvents =
        [...events];

}


/* =========================================================
   DATE PARSER
========================================================= */

function parseEventDate(dateString) {

    if (!dateString) {

        return null;

    }


    /*
        First try normal JavaScript
        date parsing.

        Example:

        August 1, 2025
        January 15, 2026
    */

    const date =
        new Date(dateString);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        /*
            Fallback:

            YYYY-MM-DD
        */

        const parts =
            String(dateString).split("-");


        if (parts.length === 3) {

            const year =
                Number(parts[0]);

            const month =
                Number(parts[1]) - 1;

            const day =
                Number(parts[2]);


            const fallbackDate =
                new Date(
                    year,
                    month,
                    day
                );


            if (
                !Number.isNaN(
                    fallbackDate.getTime()
                )
            ) {

                return fallbackDate;

            }

        }


        return null;

    }


    return date;

}


/* =========================================================
   NORMALIZED DATE
   YYYY-MM-DD
========================================================= */

function getDateKey(dateString) {

    const date =
        parseEventDate(dateString);


    if (!date) {

        return "";

    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


/* =========================================================
   GET YEAR
========================================================= */

function getEventYear(event) {

    /*
        Use Year from JSON if available.
    */

    if (event.Year) {

        return String(
            event.Year
        );

    }


    /*
        Otherwise get year from Date.
    */

    const date =
        parseEventDate(event.Date);


    if (!date) {

        return "";

    }


    return String(
        date.getFullYear()
    );

}


/* =========================================================
   GET MONTH KEY
========================================================= */

function getMonthKey(event) {

    const date =
        parseEventDate(
            event.Date
        );


    if (!date) {

        return "";

    }


    const year =
        date.getFullYear();


    const month =
        String(
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

    if (!monthFilter) {

        return;

    }


    monthFilter.innerHTML = `
        <option value="">All Months</option>
    `;


    const months = [

        ...new Set(

            events

                .map(
                    event =>
                        getMonthKey(event)
                )

                .filter(Boolean)

        )

    ]

        .sort()

        .reverse();


    months.forEach(
        month => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                month;


            option.textContent =
                formatMonth(month);


            monthFilter.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

    /*
        Make sure filter elements exist.

        This allows the same app.js
        to work on pages without filters.
    */

    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const month =
        monthFilter
            ? monthFilter.value
            : "";


    const selectedDate =
        dateFilter
            ? dateFilter.value
            : "";


    const artist =
        artistFilter
            ? artistFilter.value
            : "";


    const type =
        typeFilter
            ? typeFilter.value
            : "";


    filteredEvents =
        events.filter(
            event => {

                /*
                    Searchable fields:

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

                    .filter(
                        value =>
                            value !== null &&
                            value !== undefined
                    )

                    .join(" ")

                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const matchesMonth =
                    !month ||
                    getMonthKey(event) === month;


                const matchesDate =
                    !selectedDate ||
                    getDateKey(event.Date) ===
                        selectedDate;


                const matchesArtist =
                    !artist ||
                    event.NAMTANFILM ===
                        artist;


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

            }
        );


    /*
        Newest events first.
    */

    filteredEvents.sort(
        (a, b) => {

            return (
                parseEventDate(b.Date) -
                parseEventDate(a.Date)
            );

        }
    );


    currentPage = 1;


    renderEvents();

}


/* =========================================================
   RENDER EVENTS
========================================================= */

function renderEvents() {

    if (!eventsGrid) {

        return;

    }


    eventsGrid.innerHTML = "";


    const total =
        filteredEvents.length;


    /*
        Result count
    */

    const resultCount =
        document.getElementById(
            "resultCount"
        );


    if (resultCount) {

        resultCount.textContent =
            total;

    }


    /*
        Empty state
    */

    if (total === 0) {

        if (emptyState) {

            emptyState.classList.remove(
                "hidden"
            );

        }


        updatePagination();

        return;

    }


    if (emptyState) {

        emptyState.classList.add(
            "hidden"
        );

    }


    /*
        Pagination
    */

    const start =
        (currentPage - 1) *
        PAGE_SIZE;


    const end =
        start +
        PAGE_SIZE;


    const pageEvents =
        filteredEvents.slice(
            start,
            end
        );


    /*
        Render cards
    */

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


    updatePagination();

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


    /*
        Event image

        JSON can use:

        "Image": "images/event01.jpg"

        or

        "image": "images/event01.jpg"
    */

    const imagePath =
        event.Image ||
        event.image ||
        "";


    const imageHTML =

        imagePath

            ? `

                <img
                    src="${escapeHTML(imagePath)}"
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


    card.innerHTML = `

        <div class="event-image">

            ${imageHTML}

            <div class="event-date">

                ${escapeHTML(
                    formatShortDate(
                        event.Date
                    )
                )}

            </div>

        </div>


        <div class="event-body">

            <div class="event-tags">

                <span class="tag">

                    ${escapeHTML(
                        event.NAMTANFILM ||
                        "N/A"
                    )}

                </span>


                <span class="tag">

                    ${escapeHTML(
                        event.Type ||
                        "Other"
                    )}

                </span>

            </div>


            <h3 class="event-title">

                ${escapeHTML(
                    event.Name ||
                    "Untitled Event"
                )}

            </h3>


            <div class="event-location">

                📍

                ${escapeHTML(
                    event.Location ||
                    "—"
                )}

            </div>


            <button
                class="event-view"
                type="button"
            >
                View Event →
            </button>

        </div>

    `;


    const viewButton =
        card.querySelector(
            ".event-view"
        );


    if (viewButton) {

        viewButton.addEventListener(
            "click",
            () => openModal(event)
        );

    }


    return card;

}


/* =========================================================
   UPDATE STATISTICS
========================================================= */

function normalizeValue(value) {

    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(
            /[\s_-]+/g,
            ""
        );

}


function updateStats() {

    const total =
        events.length;


    /*
        Artist statistics
    */

    const namtanEvents =
        events.filter(
            event =>
                normalizeValue(
                    event.NAMTANFILM
                ) === "NAMTAN"
        ).length;


    const filmEvents =
        events.filter(
            event =>
                normalizeValue(
                    event.NAMTANFILM
                ) === "FILM"
        ).length;


    const namtanfilmEvents =
        events.filter(
            event =>
                normalizeValue(
                    event.NAMTANFILM
                ) === "NAMTANFILM"
        ).length;


    /*
        Type statistics
    */

    const seriesEvents =
        events.filter(
            event =>
                normalizeValue(
                    event.Type
                ) === "SERIES"
        ).length;


    const fanmeetingEvents =
        events.filter(
            event =>
                normalizeValue(
                    event.Type
                ) === "FANMEETING"
        ).length;


    const concertEvents =
        events.filter(
            event =>
                normalizeValue(
                    event.Type
                ) === "CONCERT"
        ).length;


    /*
        Everything else
    */

    const otherEvents =
        events.filter(
            event => {

                const type =
                    normalizeValue(
                        event.Type
                    );


                return (

                    type !== "SERIES" &&

                    type !== "FANMEETING" &&

                    type !== "CONCERT"

                );

            }
        ).length;


    /*
        Update DOM
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

    /*
        If pagination elements don't exist,
        simply do nothing.
    */

    if (
        !pageInfo &&
        !prevPage &&
        !nextPage
    ) {

        return;

    }


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredEvents.length /
                PAGE_SIZE
            )
        );


    if (pageInfo) {

        pageInfo.textContent =
            `${currentPage} / ${totalPages}`;

    }


    if (prevPage) {

        prevPage.disabled =
            currentPage <= 1;

    }


    if (nextPage) {

        nextPage.disabled =
            currentPage >= totalPages;

    }

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEvents() {

    /*
        Search
    */

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyFilters
        );

    }


    /*
        Filters
    */

    if (monthFilter) {

        monthFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (dateFilter) {

        dateFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (artistFilter) {

        artistFilter.addEventListener(
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


    /*
        Clear filters
    */

    if (clearFilters) {

        clearFilters.addEventListener(
            "click",
            clearAllFilters
        );

    }


    if (emptyClear) {

        emptyClear.addEventListener(
            "click",
            clearAllFilters
        );

    }


    /*
        Previous page
    */

    if (prevPage) {

        prevPage.addEventListener(
            "click",
            () => {

                if (
                    currentPage > 1
                ) {

                    currentPage--;

                    renderEvents();

                    scrollToEvents();

                }

            }
        );

    }


    /*
        Next page
    */

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

                    scrollToEvents();

                }

            }
        );

    }


    /*
        Modal
    */

    if (modalClose) {

        modalClose.addEventListener(
            "click",
            closeModal
        );

    }


    const modalOverlay =
        document.querySelector(
            ".modal-overlay"
        );


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

            if (
                event.key === "Escape"
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
            "events"
        );


    if (!eventsSection) {

        return;

    }


    window.scrollTo({

        top:
            eventsSection.offsetTop -
            90,

        behavior:
            "smooth"

    });

}


/* =========================================================
   CLEAR FILTERS
========================================================= */

function clearAllFilters() {

    if (searchInput) {

        searchInput.value =
            "";

    }


    if (monthFilter) {

        monthFilter.value =
            "";

    }


    if (dateFilter) {

        dateFilter.value =
            "";

    }


    if (artistFilter) {

        artistFilter.value =
            "";

    }


    if (typeFilter) {

        typeFilter.value =
            "";

    }


    applyFilters();

}


/* =========================================================
   OPEN MODAL
========================================================= */

function openModal(event) {

    /*
        Title
    */

    if (modalTitle) {

        modalTitle.textContent =
            event.Name ||
            "Untitled Event";

    }


    /*
        Artist
    */

    if (modalArtist) {

        modalArtist.textContent =
            event.NAMTANFILM ||
            "N/A";

    }


    /*
        Type
    */

    if (modalType) {

        modalType.textContent =
            event.Type ||
            "Other";

    }


    /*
        Date
    */

    if (modalDate) {

        modalDate.textContent =
            formatFullDate(
                event.Date
            );

    }


    /*
        Location
    */

    if (modalLocation) {

        modalLocation.textContent =
            event.Location ||
            "—";

    }


    /*
        Description
    */

    let description =
        "";


    if (event.Description) {

        description =
            event.Description;

    } else {

        const extraInfo =
            [];


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

                ? extraInfo.join(
                    " · "
                )

                : "No description available.";

    }


    if (modalDescription) {

        modalDescription.textContent =
            description;

    }


    /*
        Image
    */

    const imagePath =
        event.Image ||
        event.image ||
        "";


    if (modalImage) {

        if (imagePath) {

            modalImage.innerHTML = `

                <img
                    src="${escapeHTML(
                        imagePath
                    )}"
                    alt="${escapeHTML(
                        event.Name ||
                        "Event"
                    )}"
                >

            `;

        } else {

            modalImage.innerHTML = `

                <div
                    class="modal-image-placeholder"
                >
                    NF
                </div>

            `;

        }

    }


    /*
        Related Link
    */

    const eventLink =
        event.Link ||
        event.link ||
        "";


    if (modalLink) {

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

    }


    /*
        Open modal
    */

    if (modal) {

        modal.classList.add(
            "active"
        );

        document.body.style.overflow =
            "hidden";

    }

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (!modal) {

        return;

    }


    modal.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";

}


/* =========================================================
   FORMAT SHORT DATE
========================================================= */

function formatShortDate(
    dateString
) {

    const date =
        parseEventDate(
            dateString
        );


    if (!date) {

        return dateString ||
            "—";

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

function formatFullDate(
    dateString
) {

    const date =
        parseEventDate(
            dateString
        );


    if (!date) {

        return dateString ||
            "—";

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

function formatMonth(
    monthString
) {

    const date =
        new Date(
            `${monthString}-01T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

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


/* =========================================================
   =========================================================
   INSTAGRAM
   =========================================================
   ========================================================= */


/* =========================================================
   LOAD ALL INSTAGRAM FEEDS
========================================================= */

async function loadInstagramFeeds() {

    /*
        Check whether Instagram section exists.

        This prevents errors on pages such as:

        profile.html
        schedule.html
        archive.html
    */

    const instagramExists =
        INSTAGRAM_ACCOUNTS.some(
            account =>
                document.getElementById(
                    account.elementId
                )
        );


    if (!instagramExists) {

        return;

    }


    /*
        Load each account independently.

        Promise.allSettled means one failed
        account will NOT stop the other accounts.
    */

    await Promise.allSettled(

        INSTAGRAM_ACCOUNTS.map(
            account =>
                loadInstagramAccount(
                    account
                )
        )

    );

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


    /*
        Loading state
    */

    showInstagramLoading(
        container
    );


    try {

        /*
            Build API URL

            Example:

            ./api/instagram?account=namtan&limit=20
        */

        const url =
            new URL(
                INSTAGRAM_API_URL,
                window.location.href
            );


        url.searchParams.set(
            "account",
            account.key
        );


        url.searchParams.set(
            "limit",
            String(
                INSTAGRAM_POST_LIMIT
            )
        );


        /*
            Cache busting

            This makes sure the frontend
            does not keep an old browser response.
        */

        url.searchParams.set(
            "_",
            Date.now()
        );


        const response =
            await fetch(
                url.toString(),
                {
                    method: "GET",
                    cache: "no-store",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `Instagram API returned ${response.status}`
            );

        }


        const data =
            await response.json();


        /*
            Normalize different possible
            backend response formats.
        */

        const posts =
            normalizeInstagramResponse(
                data
            );


        if (
            !posts ||
            posts.length === 0
        ) {

            showInstagramEmpty(
                container,
                account
            );

            return;

        }


        /*
            Render posts
        */

        renderInstagramPosts(
            container,
            posts
        );


    } catch (error) {

        console.warn(
            `Instagram feed failed for ${account.username}`,
            error
        );


        /*
            Do not break the page.

            Show a quiet message instead.
        */

        showInstagramError(
            container,
            account
        );

    }

}


/* =========================================================
   NORMALIZE INSTAGRAM API RESPONSE
========================================================= */

function normalizeInstagramResponse(
    data
) {

    /*
        Preferred response:

        {
            "data": [...]
        }

        Also supports:

        {
            "posts": [...]
        }

        or directly:

        [...]
    */

    if (Array.isArray(data)) {

        return data;

    }


    if (
        data &&
        Array.isArray(data.data)
    ) {

        return data.data;

    }


    if (
        data &&
        Array.isArray(data.posts)
    ) {

        return data.posts;

    }


    return [];

}


/* =========================================================
   RENDER INSTAGRAM POSTS
========================================================= */

function renderInstagramPosts(
    container,
    posts
) {

    container.innerHTML = "";


    /*
        Keep only valid posts.
    */

    const validPosts =
        posts.filter(
            post =>
                post &&
                (
                    post.media_url ||
                    post.image ||
                    post.thumbnail_url ||
                    post.thumbnail
                )
        );


    if (
        validPosts.length === 0
    ) {

        showInstagramEmpty(
            container
        );

        return;

    }


    /*
        Render every post.
    */

    validPosts.forEach(
        (post, index) => {

            const card =
                createInstagramPostCard(
                    post,
                    index
                );


            if (card) {

                container.appendChild(
                    card
                );

            }

        }
    );

}


/* =========================================================
   CREATE INSTAGRAM POST CARD
========================================================= */

function createInstagramPostCard(
    post,
    index
) {

    /*
        Instagram Graph API commonly returns:

        media_type
        media_url
        thumbnail_url
        permalink
        timestamp
        children

        We also support alternative names
        so the Worker can be flexible.
    */

    const mediaType =
        String(
            post.media_type ||
            post.type ||
            ""
        ).toUpperCase();


    const permalink =
        post.permalink ||
        post.url ||
        post.link ||
        "";


    /*
        For VIDEO / REELS Instagram often
        provides thumbnail_url.

        For IMAGE Instagram provides media_url.
    */

    let imageUrl =
        post.thumbnail_url ||
        post.thumbnail ||
        post.media_url ||
        post.image ||
        "";


    /*
        If this is a video and only media_url
        is available, use it as the image source.

        This is mainly a fallback.

        The API should ideally return thumbnail_url.
    */

    if (!imageUrl) {

        return null;

    }


    /*
        Determine post type
    */

    let displayType =
        "PHOTO";


    if (
        mediaType === "VIDEO" ||
        mediaType === "REELS" ||
        mediaType === "REEL"
    ) {

        displayType =
            "REEL";

    } else if (
        mediaType === "CAROUSEL_ALBUM" ||
        mediaType === "CAROUSEL"
    ) {

        displayType =
            "CAROUSEL";

    }


    /*
        Create link.

        Every Instagram card opens
        the original Instagram post.
    */

    const card =
        document.createElement(
            "a"
        );


    card.className =
        "instagram-post";


    /*
        Only use target blank when
        a permalink exists.

        Otherwise the card remains
        a normal div-like link.
    */

    if (permalink) {

        card.href =
            permalink;

        card.target =
            "_blank";

        card.rel =
            "noopener noreferrer";

    } else {

        card.href =
            "#";

        card.addEventListener(
            "click",
            event => {
                event.preventDefault();
            }
        );

    }


    /*
        Image
    */

    const image =
        document.createElement(
            "img"
        );


    image.src =
        imageUrl;


    image.alt =
        post.caption
            ? String(
                post.caption
            ).slice(0, 120)
            : `Instagram post ${index + 1}`;


    image.loading =
        "lazy";


    image.decoding =
        "async";


    /*
        If image fails,
        show a simple fallback.
    */

    image.addEventListener(
        "error",
        () => {

            image.style.display =
                "none";

            const fallback =
                document.createElement(
                    "div"
                );

            fallback.className =
                "event-image-placeholder";

            fallback.textContent =
                "NF";

            fallback.style.width =
                "100%";

            fallback.style.height =
                "100%";

            fallback.style.display =
                "flex";

            fallback.style.alignItems =
                "center";

            fallback.style.justifyContent =
                "center";

            card.insertBefore(
                fallback,
                card.firstChild
            );

        }
    );


    card.appendChild(
        image
    );


    /*
        Carousel indicator

        Only show if the backend tells us
        this post has multiple children.

        Supported:

        children: [...]
        children_count
        media_count
    */

    const childrenCount =
        getInstagramChildrenCount(
            post
        );


    if (
        childrenCount > 1
    ) {

        const indicator =
            document.createElement(
                "span"
            );


        indicator.className =
            "instagram-carousel-indicator";


        indicator.textContent =
            `1/${childrenCount}`;


        card.appendChild(
            indicator
        );

    }


    /*
        Video indicator
    */

    if (
        displayType === "REEL"
    ) {

        const videoIndicator =
            document.createElement(
                "span"
            );


        videoIndicator.className =
            "instagram-video-indicator";


        videoIndicator.textContent =
            "▶";


        card.appendChild(
            videoIndicator
        );

    }


    /*
        Hover overlay
    */

    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "instagram-post-overlay";


    const type =
        document.createElement(
            "span"
        );


    type.className =
        "instagram-post-type";


    type.textContent =
        displayType;


    overlay.appendChild(
        type
    );


    card.appendChild(
        overlay
    );


    return card;

}


/* =========================================================
   GET CAROUSEL CHILD COUNT
========================================================= */

function getInstagramChildrenCount(
    post
) {

    /*
        Graph API:

        children.data
    */

    if (
        post.children &&
        Array.isArray(
            post.children.data
        )
    ) {

        return post.children.data.length;

    }


    /*
        Alternative:

        children: [...]
    */

    if (
        Array.isArray(
            post.children
        )
    ) {

        return post.children.length;

    }


    /*
        Backend may provide:

        children_count
        media_count
    */

    const childrenCount =
        Number(
            post.children_count ||
            post.media_count ||
            0
        );


    if (
        Number.isFinite(
            childrenCount
        )
    ) {

        return childrenCount;

    }


    return 0;

}


/* =========================================================
   INSTAGRAM LOADING
========================================================= */

function showInstagramLoading(
    container
) {

    container.innerHTML = `

        <div class="instagram-loading">

            Loading Instagram…

        </div>

    `;

}


/* =========================================================
   INSTAGRAM EMPTY
========================================================= */

function showInstagramEmpty(
    container,
    account
) {

    const username =
        account &&
        account.username
            ? account.username
            : "Instagram";


    container.innerHTML = `

        <div class="instagram-empty">

            No Instagram posts available
            for ${escapeHTML(username)}.

        </div>

    `;

}


/* =========================================================
   INSTAGRAM ERROR
========================================================= */

function showInstagramError(
    container,
    account
) {

    const username =
        account &&
        account.username
            ? account.username
            : "Instagram";


    container.innerHTML = `

        <div class="instagram-empty">

            Instagram feed is currently unavailable
            for ${escapeHTML(username)}.

        </div>

    `;

}


/* =========================================================
   INSTAGRAM REFRESH
========================================================= */

/*
    Optional helper.

    You can call:

        refreshInstagramFeeds();

    from the browser console later.

    It can also be used by a refresh button
    if you add one in the future.
*/

async function refreshInstagramFeeds() {

    await loadInstagramFeeds();

}


/* =========================================================
   AUTOMATIC INSTAGRAM REFRESH
========================================================= */

/*
    Refresh Instagram periodically.

    15 minutes = 900000 ms

    This does NOT refresh the whole page.

    It only requests the Instagram feed again.
*/

const INSTAGRAM_REFRESH_INTERVAL =
    15 * 60 * 1000;


setInterval(
    () => {

        /*
            Only refresh when the browser tab
            is visible.

            This avoids unnecessary requests
            when the user has another tab open.
        */

        if (
            document.visibilityState ===
            "visible"
        ) {

            refreshInstagramFeeds();

        }

    },
    INSTAGRAM_REFRESH_INTERVAL
);


/* =========================================================
   END
========================================================= */
