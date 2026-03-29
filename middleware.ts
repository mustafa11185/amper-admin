import { auth } from "./auth";
import { NextResponse } from "next/server";

const publicPaths = ["/login"];

export default auth((req) => {
  const isPublic = publicPaths.includes(req.nextUrl.pathname);
  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (req.auth && req.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
