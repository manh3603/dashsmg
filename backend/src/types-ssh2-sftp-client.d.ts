declare module "ssh2-sftp-client" {
  import type { Readable } from "node:stream";

  type ConnectConfig = {
    host: string;
    port?: number;
    username: string;
    password?: string;
    readyTimeout?: number;
  };

  export default class SftpClient {
    connect(config: ConnectConfig): Promise<void>;
    mkdir(remotePath: string, recursive?: boolean): Promise<void>;
    put(
      input: string | Buffer | Readable,
      remotePath: string,
      options?: Record<string, unknown>
    ): Promise<string>;
    end(): Promise<void>;
  }
}
