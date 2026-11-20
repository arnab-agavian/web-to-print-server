import PDFDocument from "pdfkit";
import * as adminService from "../services/admin.service.js";
import {
  customerQuerySchema,
  jobQuerySchema,
  statusSchema,
} from "../validation/admin.validation.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { downloadPublicFile } from "../services/file.service.js";
import {
  getMissingRequiredPlaceholders,
  getPlaceholderLayers,
  getProductionItemDetails,
  isPdfRenderableImage,
} from "../utils/production.js";

const MM_TO_POINTS = 72 / 25.4;
const builtInFonts = new Set([
  "Courier",
  "Courier-Bold",
  "Courier-BoldOblique",
  "Courier-Oblique",
  "Helvetica",
  "Helvetica-Bold",
  "Helvetica-BoldOblique",
  "Helvetica-Oblique",
  "Times-Bold",
  "Times-BoldItalic",
  "Times-Italic",
  "Times-Roman",
]);

function renderProductionArtwork(doc, detail, background) {
  const pageWidth = detail.canvasWidth * MM_TO_POINTS;
  const pageHeight = detail.canvasHeight * MM_TO_POINTS;
  doc.addPage({ size: [pageWidth, pageHeight], margin: 0 });
  if (background) {
    doc.image(background, 0, 0, {
      width: pageWidth,
      height: pageHeight,
    });
  }

  const scaleX = pageWidth / detail.canvasWidth;
  const scaleY = pageHeight / detail.canvasHeight;
  for (const placeholder of getPlaceholderLayers(detail)) {
    if (!placeholder.value) continue;
    const x = placeholder.x * scaleX;
    const y = placeholder.y * scaleY;
    const width = placeholder.width * scaleX;
    const height = placeholder.height * scaleY;
    const font = builtInFonts.has(placeholder.font)
      ? placeholder.font
      : "Helvetica";
    const color = /^#[0-9a-f]{3,8}$/i.test(placeholder.color)
      ? placeholder.color
      : "#111111";

    doc.save();
    if (placeholder.rotate) {
      doc.rotate(placeholder.rotate, { origin: [x, y] });
    }
    doc
      .font(font)
      .fontSize(placeholder.fontSize)
      .fillColor(color)
      .text(placeholder.value, x, y, {
        width,
        height,
        align: placeholder.align,
        ellipsis: true,
      });
    doc.restore();
  }
}

async function prepareProductionArtwork(details) {
  return Promise.all(
    details.map(async (detail) => {
      if (!detail.thumbnailPath) return { detail, background: null };
      const file = await downloadPublicFile(detail.thumbnailPath);
      if (!isPdfRenderableImage(file.buffer)) {
        const error = new Error(
          `Template artwork for order line ${detail.line} must be a PNG or JPEG image.`,
        );
        error.status = 422;
        throw error;
      }
      return { detail, background: file.buffer };
    }),
  );
}

export async function getJobs(req, res, next) {
  try {
    return successResponse(
      res,
      200,
      "Production jobs fetched successfully.",
      await adminService.listJobs(jobQuerySchema.parse(req.query)),
    );
  } catch (error) {
    return next(error);
  }
}

export async function getCustomers(req, res, next) {
  try {
    return successResponse(
      res,
      200,
      "Customers fetched successfully.",
      await adminService.listCustomers(customerQuerySchema.parse(req.query)),
    );
  } catch (error) {
    return next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = statusSchema.parse(req.body);
    const job = await adminService.updateJobStatus(req.params.id, status, req.user);
    return job
      ? successResponse(res, 200, "Job status updated successfully.", job)
      : errorResponse(res, 404, "Order not found.");
  } catch (error) {
    return next(error);
  }
}

export async function getAnalytics(req, res, next) {
  try {
    return successResponse(
      res,
      200,
      "Analytics fetched successfully.",
      await adminService.getMetrics(),
    );
  } catch (error) {
    return next(error);
  }
}

export async function downloadProductionFile(req, res, next) {
  try {
    const order = await adminService.getProductionOrder(req.params.id);
    if (!order) return errorResponse(res, 404, "Order not found.");
    const ready = order.productionReady ?? order.production_ready;
    if (!ready) {
      return errorResponse(
        res,
        409,
        "Production file is locked until proof approval.",
      );
    }

    const orderNumber = order.orderNumber || order.order_number;
    const details = getProductionItemDetails(order);
    const missingPlaceholders = getMissingRequiredPlaceholders(details);
    if (missingPlaceholders.length) {
      return errorResponse(
        res,
        422,
        `Required placeholder values are missing: ${missingPlaceholders.join(", ")}.`,
      );
    }
    const artwork = await prepareProductionArtwork(details);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${orderNumber}_production.pdf"`,
    );
    const doc = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
      info: { Title: `${orderNumber} Production File` },
    });
    doc.on("error", next);
    doc.pipe(res);
    artwork.forEach(({ detail, background }) =>
      renderProductionArtwork(doc, detail, background),
    );
    doc.end();
    return undefined;
  } catch (error) {
    return next(error);
  }
}

