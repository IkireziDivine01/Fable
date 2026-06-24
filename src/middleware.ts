import { auth } from "./auth";

export default auth((req) => {
  // Middleware for auth protection (Week 1 Day 4)
  void req;
  return null;
});

export const config = {
  matcher: ["/parent/:path*", "/kid/:path*", "/elder/:path*"],
};
