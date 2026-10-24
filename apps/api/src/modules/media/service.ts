import { AppError } from "../../http/app-error.js";
import type { Account } from "../accounts/index.js";
import { detectImage } from "./detect.js";
import type { MediaRepository, StoredMedia } from "./repository.js";
import { mediaMaxBytes } from "./schemas.js";

export type MediaService = {
  upload(account: Account, bytes: Buffer): Promise<{ id: string; url: string }>;
  read(id: string): Promise<StoredMedia>;
};

export const mediaUrl = (id: string): string => `/v1/media/${id}`;

export function createMediaService(repository: MediaRepository): MediaService {
  return {
    upload: async (account, bytes) => {
      if (bytes.length > mediaMaxBytes) throw new AppError("payload_too_large", 413);
      const mime = detectImage(bytes);
      if (mime === null) throw new AppError("image_invalid", 422);
      const id = await repository.insert(account.id, mime, bytes);
      return { id, url: mediaUrl(id) };
    },
    read: async (id) => {
      const media = await repository.find(id);
      if (media === null) throw new AppError("not_found", 404);
      return media;
    },
  };
}
