import * as cartService from "../services/cart.service.js";
import {
  addCartItemSchema,
  cartItemIdSchema,
  updateCartItemSchema,
} from "../validation/cart.validation.js";
import { errorResponse, successResponse } from "../utils/response.js";

export async function getCart(req, res, next) {
  try {
    return successResponse(
      res,
      200,
      "Cart fetched successfully.",
      await cartService.getCart(req.user),
    );
  } catch (error) {
    return next(error);
  }
}

export async function addCartItem(req, res, next) {
  try {
    const input = addCartItemSchema.parse(req.body);
    return successResponse(
      res,
      201,
      "Item added to cart successfully.",
      await cartService.addCartItem(input, req.user),
    );
  } catch (error) {
    return next(error);
  }
}

export async function updateCartItem(req, res, next) {
  try {
    const id = cartItemIdSchema.parse(req.params.id);
    const input = updateCartItemSchema.parse(req.body);
    const cart = await cartService.updateCartItem(id, input, req.user);
    return cart
      ? successResponse(res, 200, "Cart item updated successfully.", cart)
      : errorResponse(res, 404, "Cart item not found.");
  } catch (error) {
    return next(error);
  }
}

export async function removeCartItem(req, res, next) {
  try {
    const id = cartItemIdSchema.parse(req.params.id);
    const cart = await cartService.removeCartItem(id, req.user);
    return cart
      ? successResponse(res, 200, "Cart item removed successfully.", cart)
      : errorResponse(res, 404, "Cart item not found.");
  } catch (error) {
    return next(error);
  }
}

export async function clearCart(req, res, next) {
  try {
    return successResponse(
      res,
      200,
      "Cart cleared successfully.",
      await cartService.clearCart(req.user),
    );
  } catch (error) {
    return next(error);
  }
}
