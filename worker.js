const NOTION_VERSION = "2026-03-11";
const DATA_SOURCE_ID = "2dd3ab68-3eeb-8161-af9d-000b72ae36d6";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * Notion data API
     * /api/events
     */
    if (url.pathname === "/api/events") {
      return getSchedule(env);
    }

    /*
     * Schedule page
     * /schedule
     *
     * Keep the original UI from schedule.html
     */
    if (url.pathname === "/schedule") {
      return env.ASSETS.fetch(
        new Request(
          new URL("/schedule.html", request.url),
          request
        )
      );
    }

    /*
     * Everything else
     * continues to use the original static files.
     */
    return env.ASSETS.fetch(request);
  }
};


async function getSchedule(env) {

  if (!env.NOTION_TOKEN) {

    return jsonResponse(
      {
        error: "NOTION_TOKEN is not configured"
      },
      500
    );

  }


  try {

    const events = [];

    let cursor = undefined;


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
        const page of data.results || []
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


    return jsonResponse(events);


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
            item => item.plain_text
          )
          .join("") || null
      );


    case "rich_text":

      return (
        property.rich_text
          ?.map(
            item => item.plain_text
          )
          .join("") || null
      );


    case "select":

      return (
        property.select?.name ||
        null
      );


    case "multi_select":

      return (
        property.multi_select
          ?.map(
            item => item.name
          )
          .join(", ") || null
      );


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
