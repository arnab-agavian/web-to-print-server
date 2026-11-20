import * as addressService from "../services/address.service.js";
import {
  addressIdSchema,
  createAddressSchema,
  updateAddressSchema,
} from "../validation/address.validation.js";
import { errorResponse, successResponse } from "../utils/response.js";

export async function getAddresses(req, res, next) {
  try {
    return successResponse(
      res,
      200,
      "Addresses fetched successfully.",
      await addressService.listAddresses(req.user),
    );
  } catch (error) {
    return next(error);
  }
}

export async function getAddress(req, res, next) {
  try {
    const id = addressIdSchema.parse(req.params.id);
    const address = await addressService.getAddress(id, req.user);
    return address
      ? successResponse(res, 200, "Address fetched successfully.", address)
      : errorResponse(res, 404, "Address not found.");
  } catch (error) {
    return next(error);
  }
}

export async function createAddress(req, res, next) {
  try {
    const input = createAddressSchema.parse(req.body);
    return successResponse(
      res,
      201,
      "Address created successfully.",
      await addressService.createAddress(input, req.user),
    );
  } catch (error) {
    return next(error);
  }
}

export async function updateAddress(req, res, next) {
  try {
    const id = addressIdSchema.parse(req.params.id);
    const input = updateAddressSchema.parse(req.body);
    const address = await addressService.updateAddress(id, input, req.user);
    return address
      ? successResponse(res, 200, "Address updated successfully.", address)
      : errorResponse(res, 404, "Address not found.");
  } catch (error) {
    return next(error);
  }
}

export async function setDefaultAddress(req, res, next) {
  try {
    const id = addressIdSchema.parse(req.params.id);
    const address = await addressService.setDefaultAddress(id, req.user);
    return address
      ? successResponse(res, 200, "Default address updated successfully.", address)
      : errorResponse(res, 404, "Address not found.");
  } catch (error) {
    return next(error);
  }
}

export async function deleteAddress(req, res, next) {
  try {
    const id = addressIdSchema.parse(req.params.id);
    const address = await addressService.deleteAddress(id, req.user);
    return address
      ? successResponse(res, 200, "Address deleted successfully.", {
          id: address.id,
          deleted: true,
        })
      : errorResponse(res, 404, "Address not found.");
  } catch (error) {
    return next(error);
  }
}
