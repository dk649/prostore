"use server";
/* eslint-disable */
// this is a server action

import { CartItem } from "@/types";
import { cookies } from "next/headers";
import { convertToPlainObject, formatError, round2 } from "../utils";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { cartItemSchema, insertCartSchema } from "../validators";
import { Tally1 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// caluclate cart prices
const calcPrice = (items: CartItem[]) => {
  const itemsPrice = round2(
      items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
    ),
    shippingPrice = round2(itemsPrice > 100 ? 0 : 10),
    taxPrice = round2(0.15 * itemsPrice),
    totalPrice = round2(itemsPrice + shippingPrice + taxPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};

export async function addItemToCart(data: CartItem) {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart Session Not Found");

    // get session user id
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    // get cart

    const cart = await getMyCart();

    const item = cartItemSchema.parse(data);

    const product = await prisma.product.findFirst({
      where: { id: item.productID },
    });

    if (!product) throw new Error("Produce Not Found");

    if (!cart) {
      // Create new cart object

      const newCart = insertCartSchema.parse({
        userId: userId,
        items: [item],
        sessionCartId: sessionCartId,
        ...calcPrice([item]),
      });

      // console.log(newCart);

      // add to database
      await prisma.cart.create({
        data: newCart,
      });

      // revalidate produce page

      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} added to cart`,
      };
    } else {
      // check if item is already in the cart

      const existItem = (cart.items as CartItem[]).find(
        (basketItem) => basketItem.productID === item.productID
      );

      if (existItem) {
        // check the stock
        // increase quanity

        if (product.stock < existItem.qty + 1) {
          throw new Error("Out of Stock");
        }

        (cart.items as CartItem[]).find(
          (basketItem) => basketItem.productID === item.productID
        )!.qty = existItem.qty + 1;
      } else {
        // item does not exist
        // check stock
        // add item to cart.items
        if (product.stock < 1) throw new Error("Not In Stock");
        cart.items.push(item);
      }

      // save to database
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items: cart.items as Prisma.CartUpdateitemsInput[],
          ...calcPrice(cart.items as CartItem[]),
        },
      });

      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} ${
          existItem ? "updated in" : "added to"
        } cart`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}

export async function getMyCart() {
  const sessionCartId = (await cookies()).get("sessionCartId")?.value;
  if (!sessionCartId) throw new Error("Cart Session Not Found");

  // get session user id
  const session = await auth();
  const userId = session?.user?.id ? (session.user.id as string) : undefined;

  // get users cart from database
  const cart = await prisma.cart.findFirst({
    where: userId ? { userId: userId } : { sessionCartId: sessionCartId },
  });

  if (!cart) return undefined;

  // convert decimals and return

  return convertToPlainObject({
    ...cart,
    items: cart.items as CartItem[],
    itemsPrice: cart.itemsPrice.toString(),
    totalPrice: cart.totalPrice.toString(),
    shippingPrice: cart.shippingPrice.toString(),
    taxPrice: cart.taxPrice.toString(),
  });
}

export async function removeItemFromCart(productID: string) {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart Session Not Found");

    // get product

    const product = await prisma.product.findFirst({
      where: { id: productID },
    });

    if (!product) throw new Error("Product Not Found");

    // get user cart

    const cart = await getMyCart();
    if (!cart) throw new Error("Cannot Find Cart");

    // check for item in cart

    const exist = (cart.items as CartItem[]).find(
      (basketItem) => basketItem.productID === productID
    );
    if (!exist) throw new Error("Item Not Found");

    // check to see if there are more then one of the item you want to remove

    if (exist.qty === 1) {
      // remove item
      cart.items = (cart.items as CartItem[]).filter(
        (basketItem) => basketItem.productID !== exist.productID
      );
    } else {
      // decrease item by 1
      (cart.items as CartItem[]).find(
        (basketItem) => basketItem.productID === productID
      )!.qty = exist.qty - 1;
    }

    // update cart in database

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: cart.items as Prisma.CartUpdateitemsInput[],
        ...calcPrice(cart.items as CartItem[]),
      },
    });

    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: `${product.name} removed from Cart`,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
