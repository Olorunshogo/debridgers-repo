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
