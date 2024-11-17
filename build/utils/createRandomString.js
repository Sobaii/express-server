import crypto from "crypto";
const createRandomString = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
export { createRandomString };
