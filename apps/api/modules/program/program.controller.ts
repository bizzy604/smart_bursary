/**
 * Purpose: Expose program discovery endpoints to students.
 * Why important: Provides entry points for students to browse and view bursary programs.
 * Used by: Frontend student portal and mobile clients.
 */
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { County } from '../../common/decorators/county.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ListProgramsDto } from './dto/list-programs.dto';
import { ProgramService } from './program.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Programs')
@ApiBearerAuth()
@Controller('programs')
export class ProgramController {
	constructor(private readonly programService: ProgramService) {}

	@Get('active')
	@ApiOperation({ summary: 'List active programs for the current county' })
	@ApiQuery({ name: 'status', required: false, type: String })
	@ApiQuery({ name: 'academicYear', required: false, type: String })
	listActivePrograms(
		@County() countyId: string,
		@Query() query: ListProgramsDto,
	) {
		return this.programService.listActivePrograms(countyId, query);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get program details by id' })
	@ApiParam({ name: 'id', description: 'Program identifier' })
	getProgramById(
		@County() countyId: string,
		@Param('id') programId: string,
	) {
		return this.programService.getProgramById(countyId, programId);
	}
}
