import crypto from "node:crypto";
import prisma from "../config/db.js";
import { env } from "../config/env.js";
import {
  downloadStoredFile,
  removeStoredFile,
  uploadStoredFile,
} from "./file.service.js";

export function findStoredProductionFile(order, proofId) {
  return (
    order?.productionFiles?.find(
      (file) => file.proofId === proofId && file.kind === "pdf",
    ) || null
  );
}

export async function loadStoredProductionFile(file) {
  if (!file) return null;
  return {
    record: file,
    buffer: await downloadStoredFile(
      env.storage.productionBucket,
      file.storagePath,
    ),
  };
}

export async function persistProductionFile({
  order,
  proof,
  buffer,
  fileName,
  metadata,
  user,
}) {
  if (!env.hasDatabase) return null;
  const storagePath = `${order.id}/${proof.id}/${crypto.randomUUID()}.pdf`;
  const stored = await uploadStoredFile(buffer, {
    bucketName: env.storage.productionBucket,
    storagePath,
    contentType: "application/pdf",
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const productionFile = await tx.productionFile.create({
        data: {
          orderId: order.id,
          proofId: proof.id,
          kind: "pdf",
          storagePath: stored.path,
          fileName,
          sizeBytes: BigInt(stored.size),
          metadata,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          actorId: user.id,
          eventType: "production_file_generated",
          metadata: {
            productionFileId: productionFile.id,
            proofId: proof.id,
            fileName,
          },
        },
      });
      return productionFile;
    });
  } catch (error) {
    await removeStoredFile(env.storage.productionBucket, stored.path).catch(
      () => {},
    );
    throw error;
  }
}
