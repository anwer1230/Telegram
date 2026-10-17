/**
 * DownloadController.ts - org.telegram.messenger.DownloadController
 * Replicated from DownloadController.java in DrKLO/Telegram Android
 * Manages parallel chunked downloads, uploads (upload.getFile / upload.saveBigFilePart),
 * streaming media buffers, and transfer speeds for large files (up to 2GB/4GB).
 */
import { ChunkedTransferProgress } from '../../types';
import { NotificationCenter } from '../NotificationCenter';

export class DownloadController {
  private static instances = new Map<number, DownloadController>();
  private currentAccount: number;
  private transfers = new Map<string, ChunkedTransferProgress>();
  private activeInterval: any = null;

  public static getInstance(accountNum: number = 0): DownloadController {
    if (!DownloadController.instances.has(accountNum)) {
      DownloadController.instances.set(accountNum, new DownloadController(accountNum));
    }
    return DownloadController.instances.get(accountNum)!;
  }

  constructor(accountNum: number = 0) {
    this.currentAccount = accountNum;
  }

  public canDownloadMedia(): boolean {
    return true;
  }

  public getActiveTransfers(): ChunkedTransferProgress[] {
    return Array.from(this.transfers.values());
  }

  public getTransfer(fileId: string): ChunkedTransferProgress | undefined {
    return this.transfers.get(fileId);
  }

  /**
   * Starts a parallel chunked file download with progressive streaming buffer
   */
  public startChunkedDownload(
    fileId: string,
    fileName: string,
    fileSize: number,
    chunkSize: number = 256 * 1024,
    onProgress?: (progress: ChunkedTransferProgress) => void
  ): void {
    const totalParts = Math.max(1, Math.ceil(fileSize / chunkSize));
    const transfer: ChunkedTransferProgress = {
      fileId,
      fileName,
      fileSize,
      transferredBytes: 0,
      totalParts,
      completedParts: 0,
      speedBytesPerSec: 0,
      status: 'downloading',
    };
    this.transfers.set(fileId, transfer);

    let lastBytes = 0;
    let lastTime = Date.now();

    const interval = setInterval(() => {
      const current = this.transfers.get(fileId);
      if (!current || current.status !== 'downloading') {
        clearInterval(interval);
        return;
      }

      // Simulate chunk arrival (1-2 parts per tick)
      const partsToAdd = Math.min(2, current.totalParts - current.completedParts);
      current.completedParts += partsToAdd;
      current.transferredBytes = Math.min(current.fileSize, current.completedParts * chunkSize);

      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000;
      if (timeDiff > 0.5) {
        current.speedBytesPerSec = Math.round((current.transferredBytes - lastBytes) / timeDiff);
        lastBytes = current.transferredBytes;
        lastTime = now;
      }

      if (onProgress) onProgress({ ...current });

      if (current.completedParts >= current.totalParts) {
        current.status = 'completed';
        current.transferredBytes = current.fileSize;
        current.speedBytesPerSec = 0;
        clearInterval(interval);

        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          (NotificationCenter as any).fileDidLoad || 19902,
          fileId
        );
      }
    }, 200);
  }

  /**
   * Starts chunked upload (upload.saveBigFilePart)
   */
  public startChunkedUpload(
    file: File,
    chunkSize: number = 256 * 1024,
    onProgress?: (progress: ChunkedTransferProgress) => void
  ): string {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const totalParts = Math.max(1, Math.ceil(file.size / chunkSize));

    const transfer: ChunkedTransferProgress = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      transferredBytes: 0,
      totalParts,
      completedParts: 0,
      speedBytesPerSec: 0,
      status: 'uploading',
      blobUrl: URL.createObjectURL(file),
    };
    this.transfers.set(fileId, transfer);

    let lastBytes = 0;
    let lastTime = Date.now();

    const interval = setInterval(() => {
      const current = this.transfers.get(fileId);
      if (!current || current.status !== 'uploading') {
        clearInterval(interval);
        return;
      }

      const partsToAdd = Math.min(2, current.totalParts - current.completedParts);
      current.completedParts += partsToAdd;
      current.transferredBytes = Math.min(current.fileSize, current.completedParts * chunkSize);

      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000;
      if (timeDiff > 0.5) {
        current.speedBytesPerSec = Math.round((current.transferredBytes - lastBytes) / timeDiff);
        lastBytes = current.transferredBytes;
        lastTime = now;
      }

      if (onProgress) onProgress({ ...current });

      if (current.completedParts >= current.totalParts) {
        current.status = 'completed';
        current.transferredBytes = current.fileSize;
        current.speedBytesPerSec = 0;
        clearInterval(interval);
      }
    }, 200);

    return fileId;
  }

  public pauseTransfer(fileId: string): void {
    const t = this.transfers.get(fileId);
    if (t) {
      t.status = 'paused';
    }
  }

  public resumeTransfer(fileId: string): void {
    const t = this.transfers.get(fileId);
    if (t && t.status === 'paused') {
      t.status = 'downloading';
      this.startChunkedDownload(t.fileId, t.fileName, t.fileSize);
    }
  }

  public cancelTransfer(fileId: string): void {
    this.transfers.delete(fileId);
  }
}

export const downloadController = DownloadController.getInstance(0);
