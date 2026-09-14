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


    for (
        const block
        of blocks
    ) {

        const type =
            block.type;


        /*
         * LIST
         */

        if (
            type ===
            "bulleted_list_item"
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


            html +=
                `<li>${renderRichText(
                    block.bulleted_list_item?.rich_text
                )}`;


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


        if (
            type ===
            "numbered_list_item"
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


            html +=
                `<li>${renderRichText(
                    block.numbered_list_item?.rich_text
                )}`;


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


        /*
         * PARAGRAPH
         */

        if (type === "paragraph") {

            const text =
                renderRichText(
                    block.paragraph?.rich_text
                );


            if (text.trim()) {

                html +=
                    `<p>${text}</p>`;
            }

            continue;
        }


        /*
         * HEADINGS
         */

        if (type === "heading_1") {

            html +=
                `<h1>${renderRichText(
                    block.heading_1?.rich_text
                )}</h1>`;

            continue;
        }


        if (type === "heading_2") {

            html +=
                `<h2>${renderRichText(
                    block.heading_2?.rich_text
                )}</h2>`;

            continue;
        }


        if (type === "heading_3") {

            html +=
                `<h3>${renderRichText(
                    block.heading_3?.rich_text
                )}</h3>`;

            continue;
        }


        /*
         * QUOTE
         */

        if (type === "quote") {

            html +=
                `<blockquote>${renderRichText(
                    block.quote?.rich_text
                )}</blockquote>`;

            continue;
        }


        /*
         * CALLOUT
         */

        if (type === "callout") {

            const callout =
                block.callout;


            const icon =
                callout?.icon?.emoji ||
                "";


            html += `
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

            continue;
        }


        /*
         * DIVIDER
         */

        if (type === "divider") {

            html += "<hr>";

            continue;
        }


        /*
         * IMAGE
         */

        if (type === "image") {

            html +=
                renderImageBlock(
                    block.image
                );

            continue;
        }


        /*
         * VIDEO
         */

        if (type === "video") {

            html +=
                renderVideoBlock(
                    block.video
                );

            continue;
        }


        /*
         * EMBED
         */

        if (type === "embed") {

            const url =
                block.embed?.url;


            if (url) {

                html += `
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

            continue;
        }


        /*
         * BOOKMARK
         */

        if (type === "bookmark") {

            const url =
                block.bookmark?.url;


            if (url) {

                html += `
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

            continue;
        }


        /*
         * CODE
         */

        if (type === "code") {

            const code =
                block.code?.rich_text
                    ?.map(item =>
                        item.plain_text || ""
                    )
                    .join("") || "";


            html += `
                <pre><code>${escapeHTML(
                    code
                )}</code></pre>
            `;

            continue;
        }


        /*
         * TO DO
         */

        if (type === "to_do") {

            const todo =
                block.to_do;


            html += `
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

            continue;
        }


        /*
         * COLUMN LIST / COLUMN
         *
         * This is the important part
         * for Notion Grid.
         */

        if (
            type ===
            "column_list"
        ) {

            html += `
                <div class="notion-grid">
                    ${renderBlocks(
                        block._children || []
                    )}
                </div>
            `;

            continue;
        }


        if (
            type ===
            "column"
        ) {

            html += `
                <div class="notion-column">
                    ${renderBlocks(
                        block._children || []
                    )}
                </div>
            `;

            continue;
        }


        /*
         * TOGGLE / OTHER NESTED BLOCKS
         */

        if (
            block._children?.length
        ) {

            html +=
                renderBlocks(
                    block._children
                );
        }
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
