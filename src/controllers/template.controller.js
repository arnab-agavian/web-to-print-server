import * as templateService from "../services/template.service.js";
import {
  createTemplateSchema,
  templateIdSchema,
  updateTemplateSchema,
} from "../validation/template.validation.js";
import { errorResponse, successResponse } from "../utils/response.js";

export async function getProductTemplates(req, res, next) {
  try {
    const templates = await templateService.listProductTemplates(req.params.slug);
    return templates
      ? successResponse(res, 200, "Templates fetched successfully.", templates)
      : errorResponse(res, 404, "Product not found.");
  } catch (error) {
    return next(error);
  }
}

export async function getTemplate(req, res, next) {
  try {
    const id = templateIdSchema.parse(req.params.id);
    const template = await templateService.getTemplate(id);
    return template
      ? successResponse(res, 200, "Template fetched successfully.", template)
      : errorResponse(res, 404, "Template not found.");
  } catch (error) {
    return next(error);
  }
}

export async function createTemplate(req, res, next) {
  try {
    const input = createTemplateSchema.parse(req.body);
    const template = await templateService.createTemplate(req.params.slug, input);
    return template
      ? successResponse(res, 201, "Template created successfully.", template)
      : errorResponse(res, 404, "Product not found.");
  } catch (error) {
    return next(error);
  }
}

export async function updateTemplate(req, res, next) {
  try {
    const id = templateIdSchema.parse(req.params.id);
    const input = updateTemplateSchema.parse(req.body);
    const template = await templateService.updateTemplate(id, input);
    return template
      ? successResponse(res, 200, "Template updated successfully.", template)
      : errorResponse(res, 404, "Template not found.");
  } catch (error) {
    return next(error);
  }
}

export async function deleteTemplate(req, res, next) {
  try {
    const id = templateIdSchema.parse(req.params.id);
    const template = await templateService.deleteTemplate(id);
    return template
      ? successResponse(res, 200, "Template deleted successfully.", {
          id: template.id,
          deleted: true,
        })
      : errorResponse(res, 404, "Template not found.");
  } catch (error) {
    return next(error);
  }
}
