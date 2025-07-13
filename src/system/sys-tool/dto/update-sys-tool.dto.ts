import { PartialType } from '@nestjs/swagger';
import { CreateSysToolDto } from './create-sys-tool.dto';

export class UpdateSysToolDto extends PartialType(CreateSysToolDto) {}
