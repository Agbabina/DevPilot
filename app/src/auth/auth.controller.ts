import { Controller, Post, Body } from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
 import { Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    register(@Body() registerPayload: RegisterDto) {
        return this.authService.register(registerPayload);
    }
    @Post('login')
    login(@Body() loginPayload: LoginDto){
        return this.authService.validateUser(loginPayload)
    }
    @Get("me")
    @UseGuards(JwtAuthGuard)
    async getMe(@Req() request: any) {
      const user = await this.authService.getUserById(request.user.userId);
      return this.authService.publicUser(user);
    }
}



