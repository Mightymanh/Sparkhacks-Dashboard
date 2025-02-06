import type { APIRoute } from "astro";
import { auth, db } from "../../../firebase/server";
import { FirebaseAuthError } from "firebase-admin/auth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  
  // check token and session alive, check admin permission
  try {
    
    // no session or invalid session will be redirected to sign in page
    const sessionCookieObj = cookies.get("__session");
    if (!sessionCookieObj) {
      return new Response(
        "No token found", {status: 401}
      )
    }
    const sessionCookie = sessionCookieObj.value;
    const decodedCookie = await auth.verifySessionCookie(sessionCookie);
    if (!decodedCookie) {
      return new Response (
        "Invalid token", { status: 401 }
      )
    }

    // check admin permission
    const user = await auth.getUser(decodedCookie.uid)
    if (!(user.customClaims && user.customClaims.admin === true)) {
      console.error("Not admin")
      return new Response("Not accessible", {status: 401})
    }

  }
  catch (err) {
    console.log("Something is wrong with verifying cookie", err)
    return new Response("Session expired. Please sign out and sign in again", { status: 500 })
  }

  // get user's email
  try {
    const formData = await request.formData()
    const uid = formData.get("uid")?.toString() || ""

    // invalid uid
    if (uid === "") {
      return new Response("Empty uid", {status: 400})
    }

    // get email
    const uid_user = await auth.getUser(uid)
    if (!uid_user) {
      return new Response("User does not exist", {status: 400})
    }
    return new Response(uid_user.email)
  }
  catch (err) {
    console.error(err)
    if (err instanceof FirebaseAuthError) {
      if (err.code === "auth/user-not-found") {
        return new Response(err.message, {status: 500})
      }
      else {
        return new Response("Something is wrong with server", {status: 500})
      }
    }
    else {
      return new Response("Something is wrong with server", { status: 500 })
    }
  }
}