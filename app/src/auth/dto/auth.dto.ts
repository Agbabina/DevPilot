import { IsEmail, IsNotEmpty, IsString, MaxLength, Min, MinLength } from 'class-validator';
export class RegisterDto{
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  email:string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string

}

export class LoginDto{
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  email:string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string

}