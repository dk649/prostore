"use server";
import { signInFormSchema } from "../validators";

import { signIn, signOut } from "@/auth";

import { isRedirectError } from "next/dist/client/components/redirect-error";

// sign in the user with credentials provider

export async function signInwithCredentials(
  prevState: unknown,
  formData: FormData
) {
  try {
    const user = signInFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    await signIn("credentials", user);

    return {
      success: true,
      message: "signed in successfully",
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      success: false,
      message: "Invalid email or password",
    };
  }
}

// sign user out

export async function signOutUser() {
  await signOut();
}
