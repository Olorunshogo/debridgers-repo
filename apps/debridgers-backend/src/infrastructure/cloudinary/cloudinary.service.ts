import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

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
   * rejects anything else. "auto" lets it store the document as it is.
   */
  async uploadDocument(
    buffer: Buffer,
    folder: string,
    filename?: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "auto",
            ...(filename
              ? { public_id: filename.replace(/\.[^.]+$/, "") }
              : {}),
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
}
