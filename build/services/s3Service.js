var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client, } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY, } from "../config/env.js";
const createRandomString = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
const client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
});
function s3UploadFile(bucketName, buffer, mimetype) {
    return __awaiter(this, void 0, void 0, function* () {
        const params = {
            Bucket: bucketName,
            Key: createRandomString(),
            Body: buffer,
            ContentType: mimetype,
        };
        yield client.send(new PutObjectCommand(params));
        return params.Key;
    });
}
function s3GetFileSignedUrl(bucketName, key) {
    return __awaiter(this, void 0, void 0, function* () {
        const params = {
            Bucket: bucketName,
            Key: key,
        };
        const url = yield getSignedUrl(client, new GetObjectCommand(params), {
            expiresIn: 3600,
        });
        return url;
    });
}
function s3DeleteFile(bucketName, key) {
    return __awaiter(this, void 0, void 0, function* () {
        const deleteParams = {
            Bucket: bucketName,
            Key: key,
        };
        const result = yield client.send(new DeleteObjectCommand(deleteParams));
        return result;
    });
}
export { s3DeleteFile, s3GetFileSignedUrl, s3UploadFile };
