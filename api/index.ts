import { IncomingMessage, ServerResponse } from "http";
import server from "../apps/backend/src/index";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return server(req, res);
}
