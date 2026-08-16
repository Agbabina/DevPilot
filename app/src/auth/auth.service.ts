import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Repository } from 'typeorm';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { User } from './user.entity';
import { JwtService } from '@nestjs/jwt';
const scrypt = promisify(scryptCallback);
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService
) {}
  async register({ username, email, password }: RegisterDto) {
    email = email.trim().toLowerCase();
    if (await this.users.findOne({ where: [{ username }, { email }] })) throw new ConflictException('Username or email is already in use');
    const user = await this.users.save(this.users.create({ username, email, passwordHash: await this.hashPassword(password) }));
    return this.publicUser(user);
  }
  async validateUser({ email, password }: LoginDto) {
    const user = await this.users.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    const publicUser= this.publicUser(user);
    return{
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
      }),
      user: publicUser,
    }
  }
  private async hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); const key = await scrypt(password, salt, 64) as Buffer; return `${salt}:${key.toString('hex')}`; }
  private async verifyPassword(password: string, stored: string) { const [salt, hex] = stored.split(':'); if (!salt || !hex) return false; const key = await scrypt(password, salt, 64) as Buffer; const saved = Buffer.from(hex, 'hex'); return saved.length === key.length && timingSafeEqual(saved, key); }
  async getUserById(id: number) {
    return this.users.findOne({ where: { id } });
  }

  public publicUser(user: User | null) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      level: user.level,
      totalXp: user.totalXp,
      coins: user.coins,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      createdAt: user.createdAt,
    };
  }
}


