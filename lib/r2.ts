import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const bucket = process.env.R2_BUCKET_NAME!;

export async function uploadToR2(
  path: string,
  body: Buffer,
  contentType: string
) {
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function deleteFromR2(path: string) {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: path,
    })
  );
}