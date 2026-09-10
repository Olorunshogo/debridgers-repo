import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

type ParsedCloudinaryUrl = {
  resourceType: string;
  deliveryType: string;
  publicId: string;
  format: string | null;
};

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get<string>("CloudinaryConfig.cloudName"),
      api_key: config.get<string>("CloudinaryConfig.apiKey"),
      api_secret: config.get<string>("CloudinaryConfig.apiSecret"),
    });
  }

  /*
   * A CV is usually a PDF or a Word document, not an image, so this cannot go
   * through uploadBuffer: that pins resource_type to "image" and Cloudinary
   * rejects anything else. Store as raw so delivery type matches the file.
   *
   * Public PDF/ZIP delivery is often blocked on the Cloudinary account (HTTP
   * 401 on the raw secure_url). Staff viewing goes through signedDownloadUrl.
   */
  async uploadDocument(
    buffer: Buffer,
    folder: string,
    filename?: string,
  ): Promise<string> {
    const safeId = filename
      ? filename
          .replace(/\.[^.]+$/, "")
          .replace(/[^\w.\-]+/g, "_")
          .replace(/_+/g, "_")
          .slice(0, 120)
      : undefined;

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "raw",
            type: "upload",
            ...(safeId ? { public_id: `${safeId}_${Date.now()}` } : {}),
          },
          (error, result) => {
            if (error || !result)
              return reject(error ?? new Error("Upload failed"));
            resolve(result.secure_url);
          },
        )
        .end(buffer);
    });
  }

  async uploadBuffer(buffer: Buffer, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder, resource_type: "image" }, (error, result) => {
          if (error || !result)
            return reject(error ?? new Error("Upload failed"));
          resolve(result.secure_url);
        })
        .end(buffer);
    });
  }

  /*
   * Time-limited signed download for staff. Needed because Cloudinary blocks
   * anonymous PDF delivery by default even when the asset itself is public.
   */
  signedDownloadUrl(secureUrl: string, expiresInSeconds = 3600): string {
    const parsed = this.parseDeliveryUrl(secureUrl);
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const format = parsed.format ?? "pdf";

    return cloudinary.utils.private_download_url(parsed.publicId, format, {
      resource_type: parsed.resourceType,
      type: parsed.deliveryType,
      expires_at: expiresAt,
      attachment: false,
    });
  }

  private parseDeliveryUrl(secureUrl: string): ParsedCloudinaryUrl {
    let parsed: URL;
    try {
      parsed = new URL(secureUrl);
    } catch {
      throw new Error("Invalid Cloudinary URL");
    }

    // res.cloudinary.com/<cloud>/<resource_type>/<type>/[tx]/vN/<public_id>.<ext>
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 4) {
      throw new Error("Could not parse Cloudinary public id");
    }

    const resourceType = parts[1] ?? "image";
    const deliveryType = parts[2] ?? "upload";
    const versionIdx = parts.findIndex((p) => /^v\d+$/.test(p));
    const afterVersion =
      versionIdx >= 0 ? parts.slice(versionIdx + 1) : parts.slice(3);
    if (afterVersion.length === 0) {
      throw new Error("Could not parse Cloudinary public id");
    }

    const last = decodeURIComponent(afterVersion[afterVersion.length - 1]!);
    const folder = afterVersion.slice(0, -1).map(decodeURIComponent);
    const dot = last.lastIndexOf(".");
    const format = dot > 0 ? last.slice(dot + 1) : null;
    const baseName = dot > 0 ? last.slice(0, dot) : last;
    const publicId = [...folder, baseName].join("/");

    return { resourceType, deliveryType, publicId, format };
  }
}
