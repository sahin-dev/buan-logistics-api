import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileUploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure the uploads directory exists on service init
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ filePath: string }> {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }

    // Build a unique filename: timestamp-originalname
    const uniqueName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, uniqueName);

    try {
      await fs.promises.writeFile(filePath, file.buffer);
    } catch (error) {
      throw new BadRequestException('Failed to save file.');
    }

    // Return the relative path from project root
    return { filePath: `uploads/${uniqueName}` };
  }

  async uploadMultipleFiles(files: Express.Multer.File[]): Promise<{ filePaths: string[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided.');
    }

    const filePaths: string[] = [];
    for (const file of files) {
      const res = await this.uploadFile(file);
      filePaths.push(res.filePath);
    }

    return { filePaths };
  }

  async deleteFile(filePath: string): Promise<{ message: string }> {
    if (!filePath) {
      throw new BadRequestException('File path is required.');
    }

    const absolutePath = path.join(process.cwd(), filePath);

    // Prevent directory traversal
    if (!absolutePath.startsWith(this.uploadDir)) {
      throw new BadRequestException('Invalid file path.');
    }

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('File not found.');
    }

    try {
      await fs.promises.unlink(absolutePath);
    } catch (error) {
      throw new BadRequestException('Failed to delete file.');
    }

    return { message: 'File deleted successfully.' };
  }
}
