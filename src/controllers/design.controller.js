import * as designService from "../services/design.service.js";
import {
  createDesignSchema,
  designIdSchema,
  listDesignsSchema,
  updateDesignSchema,
} from "../validation/design.validation.js";
import { errorResponse, successResponse } from "../utils/response.js";

export async function getDesigns(req, res, next) {
  try {
    const filters = listDesignsSchema.parse(req.query);
    return successResponse(
      res,
      200,
      "Designs fetched successfully.",
      await designService.listDesigns(filters, req.user),
    );
  } catch (error) {
    return next(error);
  }
}

export async function getDesign(req, res, next) {
  try {
    const id = designIdSchema.parse(req.params.id);
    const design = await designService.getDesign(id, req.user);
    return design
      ? successResponse(res, 200, "Design fetched successfully.", design)
      : errorResponse(res, 404, "Design not found.");
  } catch (error) {
    return next(error);
  }
}

export async function createDesign(req, res, next) {
  try {
    const input = createDesignSchema.parse(req.body);
    return successResponse(
      res,
      201,
      "Design created successfully.",
      await designService.createDesign(input, req.user),
    );
  } catch (error) {
    return next(error);
  }
}

export async function updateDesign(req, res, next) {
  try {
    const id = designIdSchema.parse(req.params.id);
    const input = updateDesignSchema.parse(req.body);
    const design = await designService.updateDesign(id, input, req.user);
    return design
      ? successResponse(res, 200, "Design updated successfully.", design)
      : errorResponse(res, 404, "Design not found.");
  } catch (error) {
    return next(error);
  }
}

export async function deleteDesign(req, res, next) {
  try {
    const id = designIdSchema.parse(req.params.id);
    const design = await designService.deleteDesign(id, req.user);
    return design
      ? successResponse(res, 200, "Design deleted successfully.", {
          id: design.id,
          deleted: true,
        })
      : errorResponse(res, 404, "Design not found.");
  } catch (error) {
    return next(error);
  }
}
