const NOTION_VERSION = "2026-03-11";
const DATA_SOURCE_ID = "2dd3ab68-3eeb-8161-af9d-000b72ae36d6";

const CACHE_TTL = 300; // 5 minutes

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // =====================================================
    // Notion Events API
    // =====================================================

    if (url.pathname === "/data/events") {
      return getSchedule(request, env, ctx);
    }


    // =====================================================
    // Notion Event Content API
    // =====================================================

    if (url.pathname.startsWith("/data/content/")) {

      const pageId =
        url.pathname
          .replace("/data/content/", "")
          .trim();

      if (!pageId) {
        return jsonResponse(
          {
            error: "Missing Notion page ID"
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


    // =====================================================
    // Clean URL Routes
    // =====================================================

    const routes = {
      "/": "/index.html",
      "/profile": "/profile.html",
      "/schedule": "/schedule.html",
      "/archive": "/archive.html"
    };


    if (routes[url.pathname]) {

      const assetUrl = new URL(
        routes[url.pathname],
        request.url
      );

      return env.ASSETS.fetch(
        new Request(assetUrl, {
          method: request.method,
          headers: request.headers
        })
      );

    }


    // =====================================================
    // Everything else = normal static files
    // =====================================================

    return env.ASSETS.fetch(request);
  }
};



// =========================================================
// GET ALL EVENTS
// =========================================================

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


  /*
   * Cloudflare Cache
   *
   * The cache key is based on /data/events.
   */

  const cache = caches.default;

  const cacheUrl = new URL(
    "/data/events",
    request.url
  );

  const cacheKey = new Request(
    cacheUrl.toString(),
    {
      method: "GET"
    }
  );


  // Try Cloudflare Cache first

  const cachedResponse =
    await cache.match(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }


  try {

    const events = [];

    let cursor = undefined;


    /*
     * Load all Notion pages
     */

    do {

      const body = {
        page_size: 100
      };

      if (cursor) {
        body.start_cursor = cursor;
      }


      const response = await fetch(
        `https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`,
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${env.NOTION_TOKEN}`,

            "Content-Type":
              "application/json",

            "Notion-Version":
              NOTION_VERSION
          },

          body: JSON.stringify(body)
        }
      );


      if (!response.ok) {

        const errorText =
          await response.text();

        return jsonResponse(
          {
            error:
              "Notion API request failed",

            status:
              response.status,

            details:
              errorText
          },

          500
        );
      }


      const data =
        await response.json();


      for (
        const page
        of data.results || []
      ) {

        events.push(
          convertPageToEvent(page)
        );

      }


      cursor =
        data.has_more
          ? data.next_cursor
          : undefined;


    } while (cursor);


    /*
     * Create response
     */

    const response =
      new Response(
        JSON.stringify(
          events,
          null,
          2
        ),
        {
          status: 200,

          headers: {
            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              `public, max-age=${CACHE_TTL}`
          }
        }
      );


    /*
     * Store in Cloudflare Cache
     */

    ctx.waitUntil(
      cache.put(
        cacheKey,
        response.clone()
      )
    );


    return response;


  } catch (error) {

    return jsonResponse(
      {
        error:
          "Failed to load events from Notion",

        details:
          error.message
      },

      500
    );

  }

}



// =========================================================
// GET NOTION PAGE CONTENT
// =========================================================

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


  /*
   * Normalize UUID
   *
   * Notion accepts both UUID formats,
   * but keeping the original ID is safest.
   */

  const cleanPageId =
    pageId.trim();


  /*
   * Cloudflare Cache
   *
   * Each Notion page has its own cache.
   */

  const cache =
    caches.default;

  const cacheUrl =
    new URL(
      `/data/content/${cleanPageId}`,
      request.url
    );

  const cacheKey =
    new Request(
      cacheUrl.toString(),
      {
        method: "GET"
      }
    );


  // Try cache first

  const cachedResponse =
    await cache.match(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }


  try {

    const blocks = [];

    let cursor = undefined;


    /*
     * Load all blocks
     */

    do {

      const apiUrl =
        new URL(
          `https://api.notion.com/v1/blocks/${cleanPageId}/children`
        );

      apiUrl.searchParams.set(
        "page_size",
        "100"
      );

      if (cursor) {

        apiUrl.searchParams.set(
          "start_cursor",
          cursor
        );

      }


      const response =
        await fetch(
          apiUrl.toString(),
          {
            method: "GET",

            headers: {
              "Authorization":
                `Bearer ${env.NOTION_TOKEN}`,

              "Notion-Version":
                NOTION_VERSION
            }
          }
        );


      if (!response.ok) {

        const errorText =
          await response.text();

        return jsonResponse(
          {
            error:
              "Failed to load Notion page content",

            status:
              response.status,

            details:
              errorText
          },

          500
        );

      }


      const data =
        await response.json();


      blocks.push(
        ...(data.results || [])
      );


      cursor =
        data.has_more
          ? data.next_cursor
          : undefined;


    } while (cursor);


    /*
     * Convert Notion blocks to HTML
     */

    const content =
      blocks
        .map(
          block =>
            notionBlockToHTML(block)
        )
        .filter(Boolean)
        .join("");


    const result = {
      content
    };


    const response =
      new Response(
        JSON.stringify(
          result,
          null,
          2
        ),
        {
          status: 200,

          headers: {
            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              `public, max-age=${CACHE_TTL}`
          }
        }
      );


    /*
     * Store in Cloudflare Cache
     */

    ctx.waitUntil(
      cache.put(
        cacheKey,
        response.clone()
      )
    );


    return response;


  } catch (error) {

    return jsonResponse(
      {
        error:
          "Failed to load page content",

        details:
          error.message
      },

      500
    );

  }

}



// =========================================================
// NOTION BLOCK → HTML
// =========================================================

function notionBlockToHTML(block) {

  if (!block) {
    return "";
  }


  const type =
    block.type;


  const data =
    block[type];


  if (!data) {
    return "";
  }


  switch (type) {


    // =====================================================
    // Paragraph
    // =====================================================

    case "paragraph":

      return renderRichText(
        data.rich_text
      )
        ? `<p>${renderRichText(
            data.rich_text
          )}</p>`
        : "";


    // =====================================================
    // Headings
    // =====================================================

    case "heading_1":

      return `
        <h3>
          ${renderRichText(
            data.rich_text
          )}
        </h3>
      `;


    case "heading_2":

      return `
        <h4>
          ${renderRichText(
            data.rich_text
          )}
        </h4>
      `;


    case "heading_3":

      return `
        <h5>
          ${renderRichText(
            data.rich_text
          )}
        </h5>
      `;


    // =====================================================
    // Bulleted List
    // =====================================================

    case "bulleted_list_item":

      return `
        <li>
          ${renderRichText(
            data.rich_text
          )}
        </li>
      `;


    // =====================================================
    // Numbered List
    // =====================================================

    case "numbered_list_item":

      return `
        <li>
          ${renderRichText(
            data.rich_text
          )}
        </li>
      `;


    // =====================================================
    // Quote
    // =====================================================

    case "quote":

      return `
        <blockquote>
          ${renderRichText(
            data.rich_text
          )}
        </blockquote>
      `;


    // =====================================================
    // Callout
    // =====================================================

    case "callout":

      return `
        <div class="notion-callout">
          ${data.icon?.emoji
            ? `<span class="notion-callout-icon">
                ${escapeHTML(
                  data.icon.emoji
                )}
              </span>`
            : ""
          }

          <div>
            ${renderRichText(
              data.rich_text
            )}
          </div>
        </div>
      `;


    // =====================================================
    // Divider
    // =====================================================

    case "divider":

      return `
        <hr>
      `;


    // =====================================================
    // Image
    // =====================================================

    case "image": {

      let imageUrl = null;

      if (
        data.type === "external"
      ) {

        imageUrl =
          data.external?.url || null;

      }

      else if (
        data.type === "file"
      ) {

        imageUrl =
          data.file?.url || null;

      }


      if (!imageUrl) {
        return "";
      }


      const caption =
        renderRichText(
          data.caption
        );


      return `
        <figure class="notion-image">

          <img
            src="${escapeAttribute(
              imageUrl
            )}"
            alt="${escapeAttribute(
              stripHTML(caption)
            )}"
            loading="lazy"
          >

          ${
            caption
              ? `<figcaption>
                  ${caption}
                </figcaption>`
              : ""
          }

        </figure>
      `;
    }


    // =====================================================
    // Bookmark
    // =====================================================

    case "bookmark":

      if (!data.url) {
        return "";
      }

      return `
        <p>
          <a
            href="${escapeAttribute(
              data.url
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${escapeHTML(
              data.caption?.[0]?.plain_text ||
              data.url
            )}
          </a>
        </p>
      `;


    // =====================================================
    // Link Preview
    // =====================================================

    case "link_preview":

      if (!data.url) {
        return "";
      }

      return `
        <p>
          <a
            href="${escapeAttribute(
              data.url
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${escapeHTML(
              data.url
            )}
          </a>
        </p>
      `;


    // =====================================================
    // Code
    // =====================================================

    case "code":

      return `
        <pre><code>
${escapeHTML(
  data.rich_text
    ?.map(
      item =>
        item.plain_text || ""
    )
    .join("") || ""
)}
        </code></pre>
      `;


    // =====================================================
    // To-do
    // =====================================================

    case "to_do":

      return `
        <div class="notion-todo">
          <input
            type="checkbox"
            ${data.checked ? "checked" : ""}
            disabled
          >

          <span>
            ${renderRichText(
              data.rich_text
            )}
          </span>
        </div>
      `;


    // =====================================================
    // Unsupported block
    // =====================================================

    default:

      return "";
  }

}



// =========================================================
// RENDER NOTION RICH TEXT
// =========================================================

function renderRichText(
  richText
) {

  if (!Array.isArray(richText)) {
    return "";
  }


  return richText
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
          `<del>${text}</del>`;

      }


      if (
        annotations.underline
      ) {

        text =
          `<u>${text}</u>`;

      }


      if (
        item.href
      ) {

        text =
          `<a
            href="${escapeAttribute(
              item.href
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >${text}</a>`;

      }


      return text;

    })
    .join("");

}



// =========================================================
// CONVERT PAGE TO EVENT
// =========================================================

function convertPageToEvent(page) {

  console.log(
    "NOTION COVER:",
    JSON.stringify(page.cover)
  );


  const properties =
    page.properties || {};


  return {

    /*
     * IMPORTANT
     *
     * Keep the Notion Page ID so the frontend
     * can request its content later.
     */

    PageID:
      page.id || null,


    Name:
      getPropertyValue(
        properties.Name
      ),


    Date:
      getPropertyValue(
        properties.Date
      ),


    Image:
      page.cover?.file?.url || null,


    Hashtag:
      getPropertyValue(
        properties.Hashtag
      ),


    KW:
      getPropertyValue(
        properties.KW
      ),


    Location:
      getPropertyValue(
        properties.Location
      ),


    NAMTANFILM:
      getPropertyValue(
        properties.NAMTANFILM
      ),


    Type:
      getPropertyValue(
        properties.Type
      ),


    Year:
      getPropertyValue(
        properties.Year
      )

  };

}



// =========================================================
// NOTION PROPERTY VALUE
// =========================================================

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

      return (
        property.title
          ?.map(
            item =>
              item.plain_text
          )
          .join("")
        || null
      );


    case "rich_text":

      return (
        property.rich_text
          ?.map(
            item =>
              item.plain_text
          )
          .join("")
        || null
      );


    case "select":

      return (
        property.select?.name
        || null
      );


    case "multi_select":

      return (
        property.multi_select
          ?.map(
            item =>
              item.name
          )
        || []
      );


    case "date":

      if (
        !property.date?.start
      ) {
        return null;
      }


      return property.date.end
        ? `${property.date.start} → ${property.date.end}`
        : property.date.start;


    case "number":

      return (
        property.number ?? null
      );


    case "checkbox":

      return property.checkbox;


    case "url":

      return (
        property.url || null
      );


    case "email":

      return (
        property.email || null
      );


    case "formula":

      return getFormulaValue(
        property.formula
      );


    default:

      return null;

  }

}



// =========================================================
// FORMULA
// =========================================================

function getFormulaValue(
  formula
) {

  if (!formula) {
    return null;
  }


  switch (
    formula.type
  ) {


    case "string":

      return (
        formula.string || null
      );


    case "number":

      return (
        formula.number ?? null
      );


    case "boolean":

      return formula.boolean;


    case "date":

      return (
        formula.date?.start
        || null
      );


    default:

      return null;

  }

}



// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
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



// =========================================================
// ESCAPE ATTRIBUTE
// =========================================================

function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );

}



// =========================================================
// STRIP HTML
// =========================================================

function stripHTML(
  value
) {

  return String(
    value ?? ""
  ).replace(
    /<[^>]*>/g,
    ""
  );

}



// =========================================================
// JSON RESPONSE
// =========================================================

function jsonResponse(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),

    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store"
      }
    }
  );

}
