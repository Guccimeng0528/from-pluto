/* =========================================================
   FROM PLUTO — WORKER
   Notion Event API + Notion Page Content
   ========================================================= */

const NOTION_VERSION = "2026-03-11";
const DATA_SOURCE_ID = "2dd3ab68-3eeb-8161-af9d-000b72ae36d6";

const CACHE_TTL = 300;


/* =========================================================
   MAIN
========================================================= */

export default {
    async fetch(request, env, ctx) {

        const url = new URL(request.url);

        /* EVENTS */
        if (url.pathname === "/data/events") {
            return getSchedule(request, env, ctx);
        }

        /* PAGE CONTENT */
        if (url.pathname.startsWith("/data/content/")) {

            const pageId =
                decodeURIComponent(
                    url.pathname.replace("/data/content/", "")
                );

            if (!pageId) {
                return jsonResponse(
                    { error: "Missing page ID" },
                    400
                );
            }

            return getPageContent(
                request,
                env,
                ctx,
                pageId
            );
        }


        /* CLEAN ROUTES */

        if (url.pathname === "/") {
            return env.ASSETS.fetch(
                new Request(
                    new URL("/index.html", request.url),
                    request
                )
            );
        }

        if (url.pathname === "/profile") {
            return env.ASSETS.fetch(
                new Request(
                    new URL("/profile.html", request.url),
                    request
                )
            );
        }

        if (url.pathname === "/schedule") {
            return env.ASSETS.fetch(
                new Request(
                    new URL("/schedule.html", request.url),
                    request
                )
            );
        }

        if (url.pathname === "/archive") {
            return env.ASSETS.fetch(
                new Request(
                    new URL("/archive.html", request.url),
                    request
                )
            );
        }


        return env.ASSETS.fetch(request);
    }
};


/* =========================================================
   EVENTS
========================================================= */

async function getSchedule(request, env, ctx) {

    if (!env.NOTION_TOKEN) {
        return jsonResponse(
            {
                error: "NOTION_TOKEN is not configured"
            },
            500
        );
    }

    const cache =
        caches.default;

    const cacheKey =
        new Request(
            new URL(
                "/data/events",
                request.url
            ),
            request
        );

    const cached =
        await cache.match(cacheKey);

    if (cached) {
        return cached;
    }


    try {

        const pages = [];

        let startCursor = undefined;


        do {

            const body = {
                page_size: 100
            };

            if (startCursor) {
                body.start_cursor =
                    startCursor;
            }


            const response =
                await fetch(
                    `https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`,
                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                `Bearer ${env.NOTION_TOKEN}`,

                            "Notion-Version":
                                NOTION_VERSION,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(body)
                    }
                );


            if (!response.ok) {

                const text =
                    await response.text();

                throw new Error(
                    `Notion API ${response.status}: ${text}`
                );
            }


            const data =
                await response.json();


            pages.push(
                ...(data.results || [])
            );


            startCursor =
                data.has_more
                    ? data.next_cursor
                    : null;


        } while (startCursor);


        const events =
            pages
                .map(convertPageToEvent)
                .filter(event => event.Date);


        const response =
            jsonResponse(events);


        response.headers.set(
            "Cache-Control",
            `public, max-age=${CACHE_TTL}`
        );


        ctx.waitUntil(
            cache.put(
                cacheKey,
                response.clone()
            )
        );


        return response;


    } catch (error) {

        console.error(
            "Failed to load events:",
            error
        );


        return jsonResponse(
            {
                error:
                    error?.message ||
                    "Failed to load events"
            },
            500
        );
    }
}


/* =========================================================
   CONVERT EVENT
========================================================= */

function convertPageToEvent(page) {

    return {

        PageID:
            page.id || null,

        Name:
            getPropertyValue(
                page.properties?.Name
            ),

        Date:
            getPropertyValue(
                page.properties?.Date
            ),

        /*
         * Keep database Image property
         * if available.
         *
         * Page content images are handled separately
         * through /data/content/{PageID}.
         */
        Image:
            getPropertyValue(
                page.properties?.Image
            ) ||
            page.cover?.file?.url ||
            page.cover?.external?.url ||
            null,

        Hashtag:
            getPropertyValue(
                page.properties?.Hashtag
            ),

        KW:
            getPropertyValue(
                page.properties?.KW
            ),

        Location:
            getPropertyValue(
                page.properties?.Location
            ),

        NAMTANFILM:
            getPropertyValue(
                page.properties?.NAMTANFILM
            ),

        Type:
            getPropertyValue(
                page.properties?.Type
            ),

        Year:
            getPropertyValue(
                page.properties?.Year
            ),

        Link:
            getPropertyValue(
                page.properties?.Link
            )
    };
}


/* =========================================================
   NOTION PROPERTY VALUE
========================================================= */

function getPropertyValue(property) {

    if (!property) {
        return null;
    }


    switch (property.type) {

        case "title":
            return richTextToPlainText(
                property.title
            );


        case "rich_text":
            return richTextToPlainText(
                property.rich_text
            );


        case "select":
            return property.select?.name || null;


        case "multi_select":
            return (
                property.multi_select || []
            ).map(item => item.name);


        case "date":
            return property.date?.start || null;


        case "number":
            return property.number;


        case "checkbox":
            return property.checkbox;


        case "url":
            return property.url;


        case "email":
            return property.email;


        case "formula":

            if (
                property.formula?.type ===
                "string"
            ) {
                return property.formula.string;
            }

            if (
                property.formula?.type ===
                "number"
            ) {
                return property.formula.number;
            }

            if (
                property.formula?.type ===
                "boolean"
            ) {
                return property.formula.boolean;
            }

            if (
                property.formula?.type ===
                "date"
            ) {
                return property.formula.date?.start;
            }

            return null;


        case "files":

            return (
                property.files || []
            ).map(file => {

                if (file.type === "file") {
                    return file.file?.url;
                }

                if (file.type === "external") {
                    return file.external?.url;
                }

                return null;

            }).filter(Boolean);


        default:
            return null;
    }
}


/* =========================================================
   RICH TEXT
========================================================= */

function richTextToPlainText(items) {

    if (!Array.isArray(items)) {
        return null;
    }

    return items
        .map(item =>
            item.plain_text || ""
        )
        .join("");
}


/* =========================================================
   PAGE CONTENT
========================================================= */

async function getPageContent(
    request,
    env,
    ctx,
    pageId
) {

    if (!env.NOTION_TOKEN) {
        return jsonResponse(
            {
                error:
                    "NOTION_TOKEN is not configured"
            },
            500
        );
    }


    const cache =
        caches.default;


    const cacheKey =
        new Request(
            new URL(
                `/data/content/${encodeURIComponent(pageId)}`,
                request.url
            ),
            request
        );


    const cached =
        await cache.match(cacheKey);


    if (cached) {
        return cached;
    }


    try {

        const blocks =
            await getAllBlocks(
                env,
                pageId
            );


        const html =
            renderBlocks(blocks);


        const response =
            jsonResponse({
                pageId,
                content: html
            });


        response.headers.set(
            "Cache-Control",
            `public, max-age=${CACHE_TTL}`
        );


        ctx.waitUntil(
            cache.put(
                cacheKey,
                response.clone()
            )
        );


        return response;


    } catch (error) {

        console.error(
            "Failed to load Notion content:",
            error
        );


        return jsonResponse(
            {
                error:
                    error?.message ||
                    "Failed to load Notion content"
            },
            500
        );
    }
}


/* =========================================================
   GET ALL BLOCKS
========================================================= */

async function getAllBlocks(
    env,
    blockId
) {

    const allBlocks = [];

    let cursor = undefined;


    do {

        const url =
            new URL(
                `https://api.notion.com/v1/blocks/${blockId}/children`
            );


        url.searchParams.set(
            "page_size",
            "100"
        );


        if (cursor) {
            url.searchParams.set(
                "start_cursor",
                cursor
            );
        }


        const response =
            await fetch(
                url,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${env.NOTION_TOKEN}`,

                        "Notion-Version":
                            NOTION_VERSION
                    }
                }
            );


        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(
                `Notion blocks API ${response.status}: ${text}`
            );
        }


        const data =
            await response.json();


        for (
            const block
            of data.results || []
        ) {

            allBlocks.push(block);


            /*
             * IMPORTANT:
             *
             * Notion Grid uses nested
             * column_list / column blocks.
             *
             * Recursively fetch children.
             */
            if (block.has_children) {

                const children =
                    await getAllBlocks(
                        env,
                        block.id
                    );


                block._children =
                    children;
            }
        }


        cursor =
            data.has_more
                ? data.next_cursor
                : null;


    } while (cursor);


    return allBlocks;
}



/* =========================================================
   RENDER BLOCKS
   Supports:
   - normal blocks
   - nested blocks
   - column_list / column
   - multiple columns of images
   - Masonry media grid
========================================================= */

function renderBlocks(blocks) {

    if (!Array.isArray(blocks)) {
        return "";
    }

    let html = "";
    let currentList = null;

    const closeList = () => {

        if (currentList === "bulleted") {
            html += "</ul>";
        }

        if (currentList === "numbered") {
            html += "</ol>";
        }

        currentList = null;
    };


    /*
     * Render a normal block.
     */
    const renderSingleBlock = (block) => {

        if (!block) {
            return "";
        }

        const type = block.type;


        /* =========================
           IMAGE
        ========================= */

        if (type === "image") {

            return renderImageBlock(
                block.image
            );
        }


        /* =========================
           VIDEO
        ========================= */

        if (type === "video") {

            return renderVideoBlock(
                block.video
            );
        }


        /* =========================
           PARAGRAPH
        ========================= */

        if (type === "paragraph") {

            const text =
                renderRichText(
                    block.paragraph?.rich_text
                );

            return text.trim()
                ? `<p>${text}</p>`
                : "";
        }


        /* =========================
           HEADINGS
        ========================= */

        if (type === "heading_1") {

            return `
                <h1>
                    ${renderRichText(
                        block.heading_1?.rich_text
                    )}
                </h1>
            `;
        }


        if (type === "heading_2") {

            return `
                <h2>
                    ${renderRichText(
                        block.heading_2?.rich_text
                    )}
                </h2>
            `;
        }


        if (type === "heading_3") {

            return `
                <h3>
                    ${renderRichText(
                        block.heading_3?.rich_text
                    )}
                </h3>
            `;
        }


        /* =========================
           QUOTE
        ========================= */

        if (type === "quote") {

            return `
                <blockquote>
                    ${renderRichText(
                        block.quote?.rich_text
                    )}
                </blockquote>
            `;
        }


        /* =========================
           CALLOUT
        ========================= */

        if (type === "callout") {

            const callout =
                block.callout;

            const icon =
                callout?.icon?.emoji || "";

            return `
                <div class="notion-callout">

                    <div class="notion-callout-icon">
                        ${escapeHTML(icon)}
                    </div>

                    <div>
                        ${renderRichText(
                            callout?.rich_text
                        )}
                    </div>

                </div>
            `;
        }


        /* =========================
           DIVIDER
        ========================= */

        if (type === "divider") {
            return "<hr>";
        }


        /* =========================
           EMBED
        ========================= */

        if (type === "embed") {

            const url =
                block.embed?.url;

            if (!url) {
                return "";
            }

            return `
                <div class="notion-embed">

                    <a
                        href="${escapeAttribute(url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View embedded content →
                    </a>

                </div>
            `;
        }


        /* =========================
           BOOKMARK
        ========================= */

        if (type === "bookmark") {

            const url =
                block.bookmark?.url;

            if (!url) {
                return "";
            }

            return `
                <div class="notion-bookmark">

                    <a
                        href="${escapeAttribute(url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${escapeHTML(url)}
                    </a>

                </div>
            `;
        }


        /* =========================
           CODE
        ========================= */

        if (type === "code") {

            const code =
                block.code?.rich_text
                    ?.map(item =>
                        item.plain_text || ""
                    )
                    .join("") || "";

            return `
                <pre>
                    <code>
                        ${escapeHTML(code)}
                    </code>
                </pre>
            `;
        }


        /* =========================
           TO DO
        ========================= */

        if (type === "to_do") {

            const todo =
                block.to_do;

            return `
                <div class="notion-todo">

                    <input
                        type="checkbox"
                        disabled
                        ${todo?.checked ? "checked" : ""}
                    >

                    <span>
                        ${renderRichText(
                            todo?.rich_text
                        )}
                    </span>

                </div>
            `;
        }


        /* =========================
           NESTED BLOCK
        ========================= */

        if (
            block._children &&
            block._children.length
        ) {

            return renderBlocks(
                block._children
            );
        }


        return "";
    };


    /*
     * Collect ALL media blocks recursively.
     *
     * This is the important fix.
     *
     * Example:
     *
     * column_list
     *   ├─ column
     *   │   ├─ image
     *   │   └─ image
     *   │
     *   ├─ column
     *   │   ├─ image
     *   │   └─ image
     *   │
     *   └─ column
     *       ├─ image
     *       └─ image
     *
     * becomes ONE media grid.
     */

    const collectMediaBlocks = (items) => {

        const media = [];

        if (!Array.isArray(items)) {
            return media;
        }

        for (const item of items) {

            if (!item) {
                continue;
            }

            if (
                item.type === "image" ||
                item.type === "video"
            ) {

                media.push(item);

                continue;
            }

            if (
                item._children &&
                item._children.length
            ) {

                media.push(
                    ...collectMediaBlocks(
                        item._children
                    )
                );
            }
        }

        return media;
    };


    /*
     * Check whether a column_list contains
     * only media / nested columns.
     *
     * If yes, we can safely flatten everything
     * into one Masonry grid.
     */

    const isMediaOnlyColumnList = (items) => {

        if (!Array.isArray(items)) {
            return false;
        }

        for (const item of items) {

            if (!item) {
                continue;
            }

            const type =
                item.type;

            if (
                type === "column"
            ) {

                if (
                    !isMediaOnlyColumnList(
                        item._children || []
                    )
                ) {
                    return false;
                }

                continue;
            }

            if (
                type === "column_list"
            ) {

                if (
                    !isMediaOnlyColumnList(
                        item._children || []
                    )
                ) {
                    return false;
                }

                continue;
            }

            if (
                type === "image" ||
                type === "video"
            ) {
                continue;
            }

            /*
             * Anything else means this is
             * not a pure media grid.
             */

            return false;
        }

        return true;
    };


    /*
     * Main loop
     */

    for (const block of blocks) {

        if (!block) {
            continue;
        }

        const type =
            block.type;


        /* =========================
           BULLETED LIST
        ========================= */

        if (
            type === "bulleted_list_item"
        ) {

            if (
                currentList !==
                "bulleted"
            ) {

                closeList();

                html += "<ul>";

                currentList =
                    "bulleted";
            }

            html += `
                <li>
                    ${renderRichText(
                        block.bulleted_list_item?.rich_text
                    )}
            `;

            if (
                block._children?.length
            ) {

                html +=
                    renderBlocks(
                        block._children
                    );
            }

            html += "</li>";

            continue;
        }


        /* =========================
           NUMBERED LIST
        ========================= */

        if (
            type === "numbered_list_item"
        ) {

            if (
                currentList !==
                "numbered"
            ) {

                closeList();

                html += "<ol>";

                currentList =
                    "numbered";
            }

            html += `
                <li>
                    ${renderRichText(
                        block.numbered_list_item?.rich_text
                    )}
            `;

            if (
                block._children?.length
            ) {

                html +=
                    renderBlocks(
                        block._children
                    );
            }

            html += "</li>";

            continue;
        }


        closeList();


       /* =========================
   COLUMN LIST
========================= */

if (type === "column_list") {

    const columns =
        (block._children || [])
            .filter(child =>
                child &&
                child.type === "column"
            );

    /*
     * IMPORTANT
     *
     * Do NOT use isMediaOnlyColumnList()
     * here.
     *
     * Notion columns may contain:
     * - images
     * - videos
     * - text
     * - captions
     * - dividers
     * - other blocks
     *
     * We must render EVERY column.
     */

    html += `
        <div class="notion-grid notion-column-list">
    `;

    for (const column of columns) {

        html += `
            <div class="notion-column">
                ${renderBlocks(
                    column._children || []
                )}
            </div>
        `;
    }

    html += `
        </div>
    `;

    continue;
}


 /* =========================
   COLUMN
========================= */

if (type === "column") {

    html += renderBlocks(
        block._children || []
    );

    continue;
}


        /* =========================
           NORMAL BLOCK
        ========================= */

        html +=
            renderSingleBlock(
                block
            );
    }


    closeList();


    return html;
}



/* =========================================================
   IMAGE BLOCK
========================================================= */

function renderImageBlock(image) {

    if (!image) {
        return "";
    }


    let url = null;


    if (image.type === "file") {
        url =
            image.file?.url;
    }


    if (
        image.type ===
        "external"
    ) {
        url =
            image.external?.url;
    }


    if (!url) {
        return "";
    }


    const caption =
        renderRichText(
            image.caption
        );


    return `
        <figure
            class="notion-media-item notion-image-item"
        >
            <img
                src="${escapeAttribute(url)}"
                alt="${escapeAttribute(
                    stripHTML(caption) ||
                    "Event image"
                )}"
                loading="lazy"
                decoding="async"
                data-lightbox="image"
            >

            ${
                caption
                    ? `<figcaption>${caption}</figcaption>`
                    : ""
            }
        </figure>
    `;
}


/* =========================================================
   VIDEO BLOCK
========================================================= */

function renderVideoBlock(video) {

    if (!video) {
        return "";
    }


    let url = null;


    if (video.type === "file") {
        url =
            video.file?.url;
    }


    if (
        video.type ===
        "external"
    ) {
        url =
            video.external?.url;
    }


    if (!url) {
        return "";
    }


    return `
        <figure
            class="notion-media-item notion-video-item"
        >
            <video
                controls
                preload="metadata"
                playsinline
                src="${escapeAttribute(url)}"
            ></video>
        </figure>
    `;
}


/* =========================================================
   RICH TEXT → HTML
========================================================= */

function renderRichText(items) {

    if (!Array.isArray(items)) {
        return "";
    }


    return items
        .map(item => {

            let text =
                escapeHTML(
                    item.plain_text || ""
                );


            const annotations =
                item.annotations || {};


            if (
                annotations.code
            ) {
                text =
                    `<code>${text}</code>`;
            }


            if (
                annotations.bold
            ) {
                text =
                    `<strong>${text}</strong>`;
            }


            if (
                annotations.italic
            ) {
                text =
                    `<em>${text}</em>`;
            }


            if (
                annotations.strikethrough
            ) {
                text =
                    `<s>${text}</s>`;
            }


            if (
                annotations.underline
            ) {
                text =
                    `<u>${text}</u>`;
            }


            const href =
                item.href ||
                item.text?.link?.url ||
                null;


            if (href) {

                text =
                    `<a
                        href="${escapeAttribute(href)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >${text}</a>`;
            }


            return text;

        })
        .join("");
}


/* =========================================================
   HELPERS
========================================================= */

function stripHTML(value) {

    return String(value || "")
        .replace(
            /<[^>]*>/g,
            ""
        );
}


function escapeHTML(value) {

    return String(value ?? "")
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


function escapeAttribute(value) {
    return escapeHTML(value);
}


function jsonResponse(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(data),
