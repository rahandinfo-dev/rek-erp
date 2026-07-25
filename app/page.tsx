import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/jwt";

export default async function Home() {
  const token = (await cookies()).get("token")?.value;

  if (token) {
    const payload = await verifyToken(token);

    if (payload) {
      redirect("/dashboard");
    }
  }

  redirect("/login");
}