export interface StoredObject {
  url: string;
  key: string;
}

export interface StorageAdapter {
  put(input: {
    key: string;
    body: Buffer<ArrayBufferLike>;
    contentType: string;
  }): Promise<StoredObject>;
  /** Read back an object by the URL returned from put(). Null when missing. */
  get(url: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}
