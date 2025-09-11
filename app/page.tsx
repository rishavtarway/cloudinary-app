import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();

  if (user) {
    // User is signed in, redirect to home page
    redirect("/home");
  } else {
    // User is not signed in, redirect to sign-in page
    redirect("/sign-in");
  }
}
