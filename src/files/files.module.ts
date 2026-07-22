import { Module } from '@nestjs/common';
import { cloudinaryProvider } from './cloudinary.provider';
import { FilesService } from './files.service';

@Module({
  providers: [FilesService, cloudinaryProvider],
  exports: [FilesService],
})
export class FilesModule {}
