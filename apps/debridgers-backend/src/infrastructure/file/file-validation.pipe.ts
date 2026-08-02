import {
  PipeTransform,
  Injectable,
  BadRequestException,
  Logger,
} from "@nestjs/common";

/**
 * SECURITY: Validates uploaded files for size, MIME type, and magic bytes.
 * Prevents DoS attacks, malware uploads, and file spoofing.
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly logger = new Logger(FileValidationPipe.name);

  // Configuration
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  private readonly ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf", // For CVs
  ]);

  private readonly ALLOWED_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf",
  ]);

  // Magic bytes (file signatures) for verification
  private readonly FILE_SIGNATURES: Record<string, Buffer[]> = {
    "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
    "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    "image/webp": [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF
    "application/pdf": [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  };

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    // 1. Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      this.logger.warn(
        `File rejected: too large (${file.size} bytes, max ${this.MAX_FILE_SIZE})`,
      );
      throw new BadRequestException(
        `File size must not exceed ${this.MAX_FILE_SIZE / 1024 / 1024}MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    // 2. Validate MIME type
    if (!this.ALLOWED_MIME_TYPES.has(file.mimetype)) {
      this.logger.warn(`File rejected: invalid MIME type (${file.mimetype})`);
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${Array.from(this.ALLOWED_MIME_TYPES).join(", ")}`,
      );
    }

    // 3. Validate file extension
    const extension = this.getFileExtension(file.originalname);
    if (!this.ALLOWED_EXTENSIONS.has(extension.toLowerCase())) {
      this.logger.warn(`File rejected: invalid extension (${extension})`);
      throw new BadRequestException(
        `Invalid file extension: ${extension}. Allowed: ${Array.from(this.ALLOWED_EXTENSIONS).join(", ")}`,
      );
    }

    // 4. Verify file signature (magic bytes) to prevent spoofing
    this.verifyFileSignature(file.buffer, file.mimetype);

    // 5. Additional security: ensure filename is safe
    this.validateFilename(file.originalname);

    this.logger.debug(
      `File validated: ${file.originalname} (${file.size} bytes, ${file.mimetype})`,
    );

    return file;
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(filename: string): string {
    const dot = filename.lastIndexOf(".");
    return dot === -1 ? "" : filename.substring(dot);
  }

  /**
   * Verify file magic bytes match MIME type
   * Prevents attackers from renaming executables as images
   */
  private verifyFileSignature(buffer: Buffer, mimeType: string): void {
    const signatures = this.FILE_SIGNATURES[mimeType];
    if (!signatures || signatures.length === 0) {
      return; // No signature check for this MIME type
    }

    const hasValidSignature = signatures.some((signature) =>
      buffer.subarray(0, signature.length).equals(signature),
    );

    if (!hasValidSignature) {
      this.logger.warn(
        `File rejected: magic bytes don't match MIME type (${mimeType})`,
      );
      throw new BadRequestException(
        `File signature does not match declared type (${mimeType}). This could indicate file spoofing or corruption.`,
      );
    }
  }

  /**
   * Ensure filename doesn't contain path traversal or special characters
   */
  private validateFilename(filename: string): void {
    // Reject path traversal attempts
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      this.logger.warn(`File rejected: suspicious filename (${filename})`);
      throw new BadRequestException("Filename contains invalid characters");
    }

    // Reject files that are too long
    if (filename.length > 255) {
      throw new BadRequestException(
        "Filename is too long (max 255 characters)",
      );
    }
  }
}
