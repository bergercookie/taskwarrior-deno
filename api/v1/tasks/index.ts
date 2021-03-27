import type { APIRequest, ServerResponse } from "aleph/types.ts";
import { TaskWarrior, UUID } from "../../../lib/mod.ts";

// globals ---------------------------------------------------------------------

// const store = globalThis as any
const tw = new TaskWarrior();

// helpers ---------------------------------------------------------------------

function trimSpaces(s: string) {
  return s.replace(/^s/, "").replace(/\s$/, "");
}

// router ----------------------------------------------------------------------
export default async function handler(req: APIRequest) {
  switch (req.method) {
    case "GET":
      return await getHandler(req);
    case "POST":
      return await getHandler(req);
    case "PUT":
      return await getHandler(req);
    case "DELETE":
      return await getHandler(req);
    default:
      return req
        .status(400)
        .json({ message: `Can't handle request: ${req.method}` });
  }
}

async function getHandler(req: APIRequest) {
  const filter = req.params.filter ? req.params.filter : "active";

  // tasks to return
  let ts = undefined;
  console.log("[index.ts:38] DEBUGGING STRING ==> 10");

  if (filter == "active") {
    ts = tw.getActiveTasks();
  } else if (filter == "all") {
    ts = tw.getAllTasks();
  } else if (filter == "completed") {
    ts = tw.getCompletedTasks();
  } else if (filter == "blocking") {
    ts = tw.getBlockingTasks();
  } else if (filter == "blocked") {
    ts = tw.getBlockedTasks();
  } else if (filter == "ready") {
    ts = tw.getReadyTasks();
  } else if (filter == "unblocked") {
    ts = tw.getUnblockedTasks();
  } else if (filter == "latest") {
    ts = [await tw.getLatestTask()];
    console.log("[index.ts:54] DEBUGGING STRING ==> 8");
    console.log(`ts: `, ts);
  } else if (filter == "some") {
    // a few tasks, by ID
    const uuids = req.params.uuids?.split(",").map(trimSpaces);
    if (!uuids || uuids.length == 0) {
      return req.status(400).json({
        message:
          'No tasks could be read. Make sure you add them as part of the query parameters in a field called uuids in a comma-separated list, e.g., {... "filter": "some", "uuids": "1,2,3"}',
      });
    }

    ts = tw.getMultipleTasks(uuids.map((s: string) => s as UUID));
  } else {
    // don't know this filter...
    return req.status(400).json({ message: `Unknown filter: ${filter}` });
  }

  // pagination --------------------------------------------------------------

  // no pagination, just return everything
  const maxPerPage = 10;
  const ts_ = await ts;
  console.log(`ts_: `, ts_);
  if (ts_.length <= maxPerPage || !("page" in req.params)) {
    return ts_;
  }

  // currently this is done here at the end, since grabbing all the TW entries
  // locally is cheap.
  // TODO what if a task is added while the client is fetching page X?
  const page = Number.parseInt(req.params.page, 10);
  if (isNaN(page)) {
    return req.status(400).json({
      message: `page parameter should be an unsigned int, got: ${req.params.page}`,
    });
  }
  if (page < 0) {
    return req.status(400).json({
      message:
        "page parameter should be an unsigned integer. You can use page: 0 for the first page of tasks",
    });
  }

  return ts_.slice(maxPerPage * page, maxPerPage * (page + 1));
}

async function postHandler(req: APIRequest) {
  req.status(200).json({ str: "Hello2" });
}

async function putHandler(req: APIRequest) {
  req.status(200).json({ str: "Hello3" });
}

async function deleteHandler(req: APIRequest) {
  req.status(200).json({ str: "Hello4" });
}
