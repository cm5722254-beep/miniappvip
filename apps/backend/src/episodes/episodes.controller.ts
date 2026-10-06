import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EpisodesService } from './episodes.service';

@ApiTags('Episodes')
@Controller('episodes')
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}
}
