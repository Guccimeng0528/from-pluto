const NOTION_VERSION = "2026-03-11";
const DATA_SOURCE_ID = "2dd3ab68-3eeb-8161-af9d-000b72ae36d6";

const CACHE_TTL = 300; // 5 minutes

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Notion Events API
    if (url.pathname === "/api/events") {
      return getSchedule(request, env, ctx);
    }

    // Public Schedule page
    if (url.pathname === "/schedule") {
      const scheduleUrl = new URL(
        "/schedule.html",
        request.url
      );

      return env.ASSETS.fetch(
        new Request(scheduleUrl, {
          method: request.method,
          headers: request.headers
        })
      );
    }

    // Everything else = normal static files
    return env.ASSETS.fetch(request);
  }
};


async function getSchedule(request, env, ctx) {

  if (!env.NOTION_TOKEN) {
    return jsonResponse(
      { error: "NOTION_TOKEN is not configured" },
      500
    );
  }


  /*
   * Cloudflare Cache
   *
   * The cache key is based on /api/events.
   * This means multiple visitors can share
   * the same cached Notion data.
   */

  const cache = caches.default;

  const cacheUrl = new URL(
    "/api/events",
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
        JSON.stringify(events, null, 2),
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
     *
     * waitUntil() means the visitor does
     * not need to wait for the cache write.
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


function convertPageToEvent(page) {

  const properties =
    page.properties || {};


  return {

    Name:
      getPropertyValue(
        properties.Name
      ),

    Date:
      getPropertyValue(
        properties.Date
      ),

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


function getPropertyValue(property) {

  if (!property) {
    return null;
  }


  switch (property.type) {

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

    return property.multi_select
        ?.map(item => item.name) || [];


    case "date":

      if (!property.date?.start) {
        return null;
      }

      return property.date.end
        ? `${property.date.start} → ${property.date.end}`
        : property.date.start;


    case "number":

      return property.number ?? null;


    case "checkbox":

      return property.checkbox;


    case "url":

      return property.url || null;


    case "email":

      return property.email || null;


    case "formula":

      return getFormulaValue(
        property.formula
      );


    default:

      return null;

  }

}


function getFormulaValue(formula) {

  if (!formula) {
    return null;
  }


  switch (formula.type) {

    case "string":

      return formula.string || null;


    case "number":

      return formula.number ?? null;


    case "boolean":

      return formula.boolean;


    case "date":

      return formula.date?.start || null;


    default:

      return null;

  }

}


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
