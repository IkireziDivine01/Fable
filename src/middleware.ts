import { auth } from "./auth";

export default auth((req) => {
  // Middleware for auth protection
  // Protected routes: /dashboard, /stories, etc.
  void req;
  return null;
});

export const config = {
  matcher: ["/dashboard/:path*", "/parent/:path*", "/kid/:path*", "/elder/:path*", "/stories/:path*"],
};
