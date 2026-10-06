import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EpisodesService {
  constructor(private readonly prisma: PrismaService) {}
  // Episodes are primarily served through /movies/:id/episodes
  // This service is used by admin module
}
