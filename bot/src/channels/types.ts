import type { PostResult } from "../types.js";

export interface PostChannel {
  name: string;
  post(content: string, priority: string): Promise<PostResult>;
  isAvailable(): boolean;
}
