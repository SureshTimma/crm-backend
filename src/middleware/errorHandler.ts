import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", error);

  const status = (error as any).status || 500;
  const message = error.message || "Internal Server Error";

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};
