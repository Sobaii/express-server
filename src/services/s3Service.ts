import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import {
  AWS_ACCESS_KEY_ID,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
} from "../config/env.js";

const createRandomString = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex"); 

const client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

async function s3UploadFile(
  bucketName: string,
  buffer: Buffer,
  mimetype: string,
) {
  const params = {
    Bucket: bucketName,
    Key: createRandomString(),
    Body: buffer,
    ContentType: mimetype,
  };

  await client.send(new PutObjectCommand(params));
  return params.Key;
}

async function s3GetFileSignedUrl(bucketName: string, key: string) {
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const url = await getSignedUrl(client, new GetObjectCommand(params), {
    expiresIn: 3600,
  });
  return url;
}

async function s3DeleteFile(bucketName: string, key: string) {
  const deleteParams = {
    Bucket: bucketName,
    Key: key,
  };
  const result = await client.send(new DeleteObjectCommand(deleteParams));
  return result;
}

export { s3DeleteFile, s3GetFileSignedUrl, s3UploadFile };
