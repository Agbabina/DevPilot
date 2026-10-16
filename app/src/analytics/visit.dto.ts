import { IsString, Length, MaxLength } from 'class-validator';

export class VisitDto {
  @IsString()
  @Length(16, 128)
  visitorId: string;

  @IsString()
  @MaxLength(512)
  path: string;
}
