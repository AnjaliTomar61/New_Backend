export function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  const message = err?.message || "Server error";

  res.status(statusCode).json({
    success: false,
    message,
    // keep stack only for non-production
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  });
}

