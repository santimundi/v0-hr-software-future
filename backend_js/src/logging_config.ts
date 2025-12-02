/**
 * Logging configuration for the HR Agent backend.
 *
 * This module sets up structured logging with:
 * - Daily log folders (YYYY-MM-DD format)
 * - Separate log files for different levels (app.log, errors.log)
 * - Automatic log rotation
 * - Timestamps and module names in log messages
 *
 * Maps from Python logging_config.py
 */

import winston from "winston";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configure logging for the application.
 *
 * Creates daily log folders and sets up file handlers for:
 * - app.log: All logs (INFO and above)
 * - errors.log: Only ERROR and CRITICAL logs
 *
 * Maps from Python setup_logging function
 */
export function setupLogging(logDir: string = "logs"): void {
  // Create base logs directory relative to backend_js root (not src)
  // __dirname is src/logging_config.ts location, so go up one level to backend_js root
  const baseLogPath = path.resolve(__dirname, "..", logDir);
  if (!fs.existsSync(baseLogPath)) {
    fs.mkdirSync(baseLogPath, { recursive: true });
  }

  // Create today's date folder (YYYY-MM-DD format)
  const today = new Date().toISOString().split("T")[0];
  const dailyLogPath = path.join(baseLogPath, today);
  if (!fs.existsSync(dailyLogPath)) {
    fs.mkdirSync(dailyLogPath, { recursive: true });
  }

  // Set up log file paths
  const appLogFile = path.join(dailyLogPath, "app.log");
  const errorsLogFile = path.join(dailyLogPath, "errors.log");

  // For testing: delete app.log if it exists to ensure overwrite (not append)
  // Winston File transport appends by default, so we delete the file first
  // to ensure a fresh start on each run
  if (fs.existsSync(appLogFile)) {
    fs.unlinkSync(appLogFile);
  }

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
      return `${timestamp} - ${level.toUpperCase()} - ${message} ${metaStr}`;
    })
  );

  // Create Winston logger with file transports
  const logger = winston.createLogger({
    level: "debug", // Capture all levels at root
    format: logFormat,
    transports: [
      // Handler 1: App log (INFO and above) - with rotation
      new winston.transports.File({
        filename: appLogFile,
        level: "info",
        maxsize: 10 * 1024 * 1024, // 10MB per file
        maxFiles: 5, // Keep 5 backup files
        format: winston.format.combine(
          winston.format((info) => {
            // Only log INFO and above
            return info.level === "info" ||
              info.level === "warn" ||
              info.level === "error" ||
              info.level === "fatal"
              ? info
              : false;
          })(),
          logFormat
        ),
      }),
      // Handler 2: Errors log (ERROR and CRITICAL only) - with rotation
      new winston.transports.File({
        filename: errorsLogFile,
        level: "error",
        maxsize: 10 * 1024 * 1024, // 10MB per file
        maxFiles: 5, // Keep 5 backup files
        format: logFormat,
      }),
    ],
  });

  // Configure Winston's default logger with ONLY file transports (no console)
  // This ensures that winston.info(), winston.error(), etc. go to files only
  // Get or create the default logger and replace its transports
  const defaultLogger = winston.loggers.get("default") || winston.createLogger();
  
  // Remove all existing transports (including any Console transport)
  defaultLogger.clear();
  
  // Add only our file transports
  for (const transport of logger.transports) {
    defaultLogger.add(transport);
  }
  
  // Set the level and format
  defaultLogger.level = "debug";
  defaultLogger.format = logFormat;
  
  // Also configure winston's root logger methods (winston.info, winston.error, etc.)
  // to use our configured logger
  winston.configure({
    level: "debug",
    format: logFormat,
    transports: [...logger.transports], // Only file transports, no console
  });
  
  // Double-check: Remove any Console transports that might have been added
  // Use remove() method instead of direct assignment (transports is read-only)
  const configuredLogger = winston.loggers.get("default");
  if (configuredLogger) {
    // Get a copy of transports array to iterate (since it's read-only)
    const transportsToCheck = [...configuredLogger.transports];
    for (const transport of transportsToCheck) {
      if (transport.constructor.name === "Console") {
        configuredLogger.remove(transport);
      }
    }
  }

  // Log the setup using the configured logger
  const separator = "=".repeat(80);
  logger.info(separator);
  logger.info(
    `NEW EXECUTION RUN - ${new Date().toISOString().replace("T", " ").split(".")[0]}`
  );
  logger.info(separator);
  logger.info(`Logging configured. Logs directory: ${dailyLogPath}`);
  logger.info(`App logs: ${appLogFile}`);
  logger.info(`Error logs: ${errorsLogFile}`);
}

/**
 * Get the path to today's log directory.
 *
 * Maps from Python get_log_path function
 */
export function getLogPath(logDir: string = "logs"): string {
  const baseLogPath = path.resolve(__dirname, "..", logDir);
  const today = new Date().toISOString().split("T")[0];
  return path.join(baseLogPath, today);
}

