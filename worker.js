/* =========================================================
   FROM PLUTO — WORKER
   Notion Event API + Notion Page Content

   FIXED:
   - Notion multiple columns
   - column_list → column → children
   - Images inside every column
   - Videos inside every column
   - Nested blocks
   - Pagination
   - Cache versioning

   Author: Guccimeng
   ========================================================= */

/* =========================================================
   CONFIG
========================================================= */

const NOTION_VERSION = "2026-03-11";
const DATA_SOURCE_ID =
    "2dd3ab68-3eeb-8161-af9d-000b72ae36d6";
const CACHE_TTL = 300;
/*
 * Change this number whenever you make
 * a major Worker/content retrieval change.
 *
 * This prevents old Cloudflare cache from
 * hiding the new result.
 */
const CACHE_VERSION = "v2";

/* =========================================================
   MAIN
========================================================= */

export default {
    async fetch(request, env, ctx) {
        const url =
            new URL(request.url);

        /* =================================================
           EVENTS
        ================================================= */

        if (
            url.pathname ===
            "/data/events"
        ) {

            return getSchedule(
                request,
                env,
                ctx
            );
        }


        /* =================================================
           PAGE CONTENT
        ================================================= */

        if (
            url.pathname.startsWith(
                "/data/content/"
            )
        ) {

            const pageId =
                decodeURIComponent(
                    url.pathname.replace(
                        "/data/content/",
                        ""
                    )
                );


            if (!pageId) {

                return jsonResponse(
                    {
                        error:
                            "Missing page ID"
                    },
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


        /* =================================================
           CLEAN ROUTES
        ================================================= */

        if (
            url.pathname === "/"
        ) {

            return env.ASSETS.fetch(
                new Request(
                    new URL(
                        "/index.html",
                        request.url
                    ),
                    request
                )
            );
        }


        if (
            url.pathname === "/profile"
        ) {

            return env.ASSETS.fetch(
                new Request(
                    new URL(
                        "/profile.html",
                        request.url
                    ),
                    request
                )
            );
        }


        if (
            url.pathname === "/schedule"
        ) {

            return env.ASSETS.fetch(
                new Request(
                    new URL(
                        "/schedule.html",
                        request.url
                    ),
                    request
                )
            );
        }


        if (
            url.pathname === "/archive"
        ) {

            return env.ASSETS.fetch(
                new Request(
                    new URL(
                        "/archive.html",
                        request.url
                    ),
                    request
                )
            );
        }


        return env.ASSETS.fetch(
            request
        );
    }
};


/* =========================================================
   EVENTS
========================================================= */

async function getSchedule(
    request,
    env,
    ctx
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


    /*
     * Cache version is included here.
     *
     * v2 = new multi-column loader
     */

    const cacheUrl =
        new URL(
            "/data/events",
            request.url
        );

    cacheUrl.searchParams.set(
        "_cache",
        CACHE_VERSION
    );


    const cacheKey =
        new Request(
            cacheUrl.toString(),
            request
        );


    const cached =
        await cache.match(
            cacheKey
        );


    if (cached) {

        return cached;
    }


    try {

        const pages = [];

        let startCursor =
            undefined;


        /* ===============================================
           PAGINATED DATABASE QUERY
        =============================================== */

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
                        method:
                            "POST",

                        headers: {

                            "Authorization":
                                `Bearer ${env.NOTION_TOKEN}`,

                            "Notion-Version":
                                NOTION_VERSION,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                body
                            )
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
                .map(
                    convertPageToEvent
                )
                .filter(
                    event =>
                        event.Date
                );


        const response =
            jsonResponse(
                events
            );


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

function convertPageToEvent(
    page
) {

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

function getPropertyValue(
    property
) {

    if (!property) {

        return null;
    }


    switch (
        property.type
    ) {


        case "title":

            return richTextToPlainText(
                property.title
            );


        case "rich_text":

            return richTextToPlainText(
                property.rich_text
            );


        case "select":

            return (
                property.select?.name ||
                null
            );


        case "multi_select":

            return (
                property.multi_select ||
                []
            ).map(
                item =>
                    item.name
            );


        case "date":

            return (
                property.date?.start ||
                null
            );


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

                return (
                    property.formula.date?.start ||
                    null
                );
            }


            return null;


        case "files":

            return (
                property.files || []
            )
                .map(
                    file => {

                        if (
                            file.type ===
                            "file"
                        ) {

                            return file.file?.url;
                        }


                        if (
                            file.type ===
                            "external"
                        ) {

                            return file.external?.url;
                        }


                        return null;
                    }
                )
                .filter(Boolean);


        default:

            return null;
    }
}


/* =========================================================
   RICH TEXT → PLAIN TEXT
========================================================= */

function richTextToPlainText(
    items
) {

    if (
        !Array.isArray(items)
    ) {

        return null;
    }


    return items
        .map(
            item =>
                item.plain_text ||
                ""
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


    /*
     * Include cache version.
     *
     * This prevents old content from
     * being returned after deployment.
     */

    const cacheUrl =
        new URL(
            `/data/content/${encodeURIComponent(pageId)}`,
            request.url
        );


    cacheUrl.searchParams.set(
        "_cache",
        CACHE_VERSION
    );


    const cacheKey =
        new Request(
            cacheUrl.toString(),
            request
        );


    const cached =
        await cache.match(
            cacheKey
        );


    if (cached) {

        return cached;
    }


    try {

        console.log(
            `[Notion] Loading page: ${pageId}`
        );


        const blocks =
            await getAllBlocks(
                env,
                pageId
            );


        console.log(
            `[Notion] Top-level blocks: ${blocks.length}`
        );


        const html =
            renderBlocks(
                blocks
            );


        const response =
            jsonResponse(
                {
                    pageId,
                    content: html
                }
            );


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
   NOTION API
   GET CHILDREN
========================================================= */

async function fetchBlockChildren(
    env,
    blockId
) {

    const results = [];

    let cursor =
        undefined;


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
                    method:
                        "GET",

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


        results.push(
            ...(data.results || [])
        );


        cursor =
            data.has_more
                ? data.next_cursor
                : null;


    } while (cursor);


    return results;
}


/* =========================================================
   GET ALL BLOCKS
=========================================================

   IMPORTANT:

   Notion column structure:

       Page
         │
         └── column_list
                │
                ├── column
                │     ├── image
                │     ├── image
                │     └── text
                │
                ├── column
                │     ├── image
                │     └── image
                │
                └── column
                      ├── image
                      └── image


   We explicitly fetch:

       page
        ↓
       column_list
        ↓
       EVERY column
        ↓
       EVERY child in every column

========================================================= */

async function getAllBlocks(
    env,
    blockId
) {

    const topLevelBlocks =
        await fetchBlockChildren(
            env,
            blockId
        );


    /*
     * Process every top-level block.
     */

    for (
        const block
        of topLevelBlocks
    ) {

        if (!block) {
            continue;
        }


        /* =================================================
           SPECIAL CASE: COLUMN LIST
        ================================================= */

        if (
            block.type ===
            "column_list"
        ) {

            console.log(
                `[Notion] Found column_list: ${block.id}`
            );


            /*
             * IMPORTANT:
             *
             * Explicitly request the children
             * of the column_list.
             */

            const columns =
                await fetchBlockChildren(
                    env,
                    block.id
                );


            /*
             * Save ALL columns.
             */

            block._children =
                columns;


            console.log(
                `[Notion] column_list ${block.id} contains ${columns.length} children`
            );


            /*
             * IMPORTANT:
             *
             * Fetch EACH column separately.
             */

            for (
                const column
                of columns
            ) {

                if (
                    !column ||
                    column.type !==
                    "column"
                ) {

                    continue;
                }


                console.log(
                    `[Notion] Fetching column: ${column.id}`
                );


                const columnChildren =
                    await fetchBlockChildren(
                        env,
                        column.id
                    );


                /*
                 * Save ALL blocks inside
                 * this specific column.
                 */

                column._children =
                    columnChildren;


                console.log(
                    `[Notion] Column ${column.id} contains ${columnChildren.length} blocks`
                );


                /*
                 * Continue recursively for
                 * nested blocks inside the column.
                 */

                for (
                    const child
                    of columnChildren
                ) {

                    if (
                        child &&
                        child.has_children
                    ) {

                        child._children =
                            await loadNestedChildren(
                                env,
                                child.id
                            );
                    }
                }
            }


            /*
             * Finished this column_list.
             */

            continue;
        }


        /* =================================================
           NORMAL NESTED BLOCK
        ================================================= */

        if (
            block.has_children
        ) {

            block._children =
                await loadNestedChildren(
                    env,
                    block.id
                );
        }
    }


    return topLevelBlocks;
}


/* =========================================================
   LOAD NESTED CHILDREN
========================================================= */

async function loadNestedChildren(
    env,
    blockId
) {

    const children =
        await fetchBlockChildren(
            env,
            blockId
        );


    for (
        const child
        of children
    ) {

        if (!child) {
            continue;
        }


        /*
         * Nested column_list
         */

        if (
            child.type ===
            "column_list"
        ) {

            const columns =
                await fetchBlockChildren(
                    env,
                    child.id
                );


            child._children =
                columns;


            for (
                const column
                of columns
            ) {

                if (
                    !column ||
                    column.type !==
                    "column"
                ) {

                    continue;
                }


                column._children =
                    await fetchBlockChildren(
                        env,
                        column.id
                    );


                for (
                    const nested
                    of column._children
                ) {

                    if (
                        nested &&
                        nested.has_children
                    ) {

                        nested._children =
                            await loadNestedChildren(
                                env,
                                nested.id
                            );
                    }
                }
            }


            continue;
        }


        /*
         * Normal nested block
         */

        if (
            child.has_children
        ) {

            child._children =
                await loadNestedChildren(
                    env,
                    child.id
                );
        }
    }


    return children;
}


/* =========================================================
   RENDER BLOCKS
========================================================= */

function renderBlocks(
    blocks
) {

    if (
        !Array.isArray(blocks)
    ) {

        return "";
    }


    let html = "";

    let currentList =
        null;


    const closeList = () => {

        if (
            currentList ===
            "bulleted"
        ) {

            html += "</ul>";
        }


        if (
            currentList ===
            "numbered"
        ) {

            html += "</ol>";
        }


        currentList =
            null;
    };


    /* =====================================================
       NORMAL BLOCK RENDERER
    ===================================================== */

    const renderSingleBlock =
        (block) => {

            if (!block) {
                return "";
            }


            const type =
                block.type;


            /* =============================================
               IMAGE
            ============================================= */

            if (
                type === "image"
            ) {

                return renderImageBlock(
                    block.image
                );
            }


            /* =============================================
               VIDEO
            ============================================= */

            if (
                type === "video"
            ) {

                return renderVideoBlock(
                    block.video
                );
            }


            /* =============================================
               PARAGRAPH
            ============================================= */

            if (
                type ===
                "paragraph"
            ) {

                const text =
                    renderRichText(
                        block.paragraph
                            ?.rich_text
                    );


                return text.trim()
                    ? `<p>${text}</p>`
                    : "";
            }


            /* =============================================
               HEADING 1
            ============================================= */

            if (
                type ===
                "heading_1"
            ) {

                return `
                    <h1>
                        ${renderRichText(
                            block.heading_1
                                ?.rich_text
                        )}
                    </h1>
                `;
            }


            /* =============================================
               HEADING 2
            ============================================= */

            if (
                type ===
                "heading_2"
            ) {

                return `
                    <h2>
                        ${renderRichText(
                            block.heading_2
                                ?.rich_text
                        )}
                    </h2>
                `;
            }


            /* =============================================
               HEADING 3
            ============================================= */

            if (
                type ===
                "heading_3"
            ) {

                return `
                    <h3>
                        ${renderRichText(
                            block.heading_3
                                ?.rich_text
                        )}
                    </h3>
                `;
            }


            /* =============================================
               QUOTE
            ============================================= */

            if (
                type === "quote"
            ) {

                return `
                    <blockquote>
                        ${renderRichText(
                            block.quote
                                ?.rich_text
                        )}
                    </blockquote>
                `;
            }


            /* =============================================
               CALLOUT
            ============================================= */

            if (
                type ===
                "callout"
            ) {

                const callout =
                    block.callout;


                const icon =
                    callout
                        ?.icon
                        ?.emoji ||
                    "";


                return `
                    <div class="notion-callout">

                        <div class="notion-callout-icon">
                            ${escapeHTML(
                                icon
                            )}
                        </div>

                        <div>
                            ${renderRichText(
                                callout
                                    ?.rich_text
                            )}
                        </div>

                    </div>
                `;
            }


            /* =============================================
               DIVIDER
            ============================================= */

            if (
                type ===
                "divider"
            ) {

                return "<hr>";
            }


            /* =============================================
               EMBED
            ============================================= */

            if (
                type === "embed"
            ) {

                const url =
                    block.embed?.url;


                if (!url) {
                    return "";
                }


                return `
                    <div class="notion-embed">

                        <a
                            href="${escapeAttribute(
                                url
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View embedded content →
                        </a>

                    </div>
                `;
            }


            /* =============================================
               BOOKMARK
            ============================================= */

            if (
                type ===
                "bookmark"
            ) {

                const url =
                    block.bookmark?.url;


                if (!url) {
                    return "";
                }


                return `
                    <div class="notion-bookmark">

                        <a
                            href="${escapeAttribute(
                                url
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${escapeHTML(
                                url
                            )}
                        </a>

                    </div>
                `;
            }


            /* =============================================
               CODE
            ============================================= */

            if (
                type === "code"
            ) {

                const code =
                    block.code
                        ?.rich_text
                        ?.map(
                            item =>
                                item.plain_text ||
                                ""
                        )
                        .join("") ||
                    "";


                return `
                    <pre>
                        <code>
                            ${escapeHTML(
                                code
                            )}
                        </code>
                    </pre>
                `;
            }


            /* =============================================
               TO DO
            ============================================= */

            if (
                type === "to_do"
            ) {

                const todo =
                    block.to_do;


                return `
                    <div class="notion-todo">

                        <input
                            type="checkbox"
                            disabled
                            ${
                                todo?.checked
                                    ? "checked"
                                    : ""
                            }
                        >

                        <span>
                            ${renderRichText(
                                todo?.rich_text
                            )}
                        </span>

                    </div>
                `;
            }


            /* =============================================
               FALLBACK NESTED BLOCK
            ============================================= */

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


    /* =====================================================
       MAIN LOOP
    ===================================================== */

    for (
        const block
        of blocks
    ) {

        if (!block) {
            continue;
        }


        const type =
            block.type;


        /* ===============================================
           BULLETED LIST
        =============================================== */

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


            html += `
                <li>
                    ${renderRichText(
                        block
                            .bulleted_list_item
                            ?.rich_text
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


        /* ===============================================
           NUMBERED LIST
        =============================================== */

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


            html += `
                <li>
                    ${renderRichText(
                        block
                            .numbered_list_item
                            ?.rich_text
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


        /* ===============================================
           COLUMN LIST
        =============================================== */

        if (
            type ===
            "column_list"
        ) {

            const columns =
                (
                    block._children ||
                    []
                )
                .filter(
                    child =>
                        child &&
                        child.type ===
                        "column"
                );


            console.log(
                `[Render] column_list → ${columns.length} columns`
            );


            /*
             * IMPORTANT:
             *
             * Every column is rendered.
             *
             * Nothing is flattened.
             * Nothing is ignored.
             */

            html += `
                <div
                    class="notion-column-list"
                >
            `;


            for (
                let i = 0;
                i < columns.length;
                i++
            ) {

                const column =
                    columns[i];


                html += `
                    <div
                        class="notion-column"
                        data-column-index="${i}"
                        data-column-id="${escapeAttribute(
                            column.id || ""
                        )}"
                    >
                        ${renderBlocks(
                            column._children ||
                            []
                        )}
                    </div>
                `;
            }


            html += `
                </div>
            `;


            continue;
        }


        /* ===============================================
           COLUMN
        =============================================== */

        if (
            type ===
            "column"
        ) {

            /*
             * Normally column is handled
             * by column_list above.
             *
             * This fallback keeps nested
             * column blocks working.
             */

            html +=
                renderBlocks(
                    block._children ||
                    []
                );


            continue;
        }


        /* ===============================================
           NORMAL BLOCK
        =============================================== */

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

function renderImageBlock(
    image
) {

    if (!image) {
        return "";
    }


    let url =
        null;


    /* ================================================
       NOTION HOSTED IMAGE
    ================================================ */

    if (
        image.type ===
        "file"
    ) {

        url =
            image.file?.url;
    }


    /* ================================================
       EXTERNAL IMAGE
    ================================================ */

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
                src="${escapeAttribute(
                    url
                )}"
                alt="${escapeAttribute(
                    stripHTML(
                        caption
                    ) ||
                    "Event image"
                )}"
                loading="lazy"
                decoding="async"
                data-lightbox="image"
            >

            ${
                caption
                    ? `
                        <figcaption>
                            ${caption}
                        </figcaption>
                    `
                    : ""
            }

        </figure>
    `;
}


/* =========================================================
   VIDEO BLOCK
========================================================= */

function renderVideoBlock(
    video
) {

    if (!video) {
        return "";
    }


    let url =
        null;


    if (
        video.type ===
        "file"
    ) {

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
                src="${escapeAttribute(
                    url
                )}"
            ></video>

        </figure>
    `;
}


/* =========================================================
   RICH TEXT → HTML
========================================================= */

function renderRichText(
    items
) {

    if (
        !Array.isArray(items)
    ) {

        return "";
    }


    return items
        .map(
            item => {

                let text =
                    escapeHTML(
                        item.plain_text ||
                        ""
                    );


                const annotations =
                    item.annotations ||
                    {};


                /* CODE */

                if (
                    annotations.code
                ) {

                    text =
                        `<code>${text}</code>`;
                }


                /* BOLD */

                if (
                    annotations.bold
                ) {

                    text =
                        `<strong>${text}</strong>`;
                }


                /* ITALIC */

                if (
                    annotations.italic
                ) {

                    text =
                        `<em>${text}</em>`;
                }


                /* STRIKETHROUGH */

                if (
                    annotations.strikethrough
                ) {

                    text =
                        `<s>${text}</s>`;
                }


                /* UNDERLINE */

                if (
                    annotations.underline
                ) {

                    text =
                        `<u>${text}</u>`;
                }


                /* LINK */

                const href =
                    item.href ||
                    item.text?.link?.url ||
                    null;


                if (href) {

                    text =
                        `
                        <a
                            href="${escapeAttribute(
                                href
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${text}
                        </a>
                        `;
                }


                return text;
            }
        )
        .join("");
}


/* =========================================================
   HELPERS
========================================================= */

function stripHTML(
    value
) {

    return String(
        value || ""
    )
        .replace(
            /<[^>]*>/g,
            ""
        );
}


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


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );
}


/* =========================================================
   JSON RESPONSE
========================================================= */

function jsonResponse(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(
            data
        ),
        {
            status,

            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",

                "Access-Control-Allow-Origin":
                    "*"
            }
        }
    );
}
