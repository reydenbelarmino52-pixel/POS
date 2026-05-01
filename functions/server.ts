import serverless from "serverless-http";
import app from "../api/server";

export const handler = serverless(app);
