import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';

interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate via Telegram — called AFTER TelegramAuthMiddleware has verified initData
   * The telegramUser passed here is already verified server-side
   */
  async authenticateTelegram(telegramUser: TelegramUserData): Promise<{ accessToken: string; user: object }> {
    const telegramId = telegramUser.id.toString();

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { telegramId },
      include: { wallet: true },
    });

    if (!user) {
      // Create new user with wallet
      try {
        user = await this.prisma.user.create({
          data: {
            telegramId,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            username: telegramUser.username,
            photoUrl: telegramUser.photo_url,
            languageCode: telegramUser.language_code,
            status: UserStatus.ACTIVE,
            wallet: {
              create: {
                balance: 0,
                currency: 'USD',
              },
            },
          },
          include: { wallet: true },
        });
        this.logger.log(`New user registered: ${telegramId}`);
      } catch (error) {
        // Handle race condition: user created between our check and create
        if ((error as { code?: string }).code === 'P2002') {
          user = await this.prisma.user.findUnique({
            where: { telegramId },
            include: { wallet: true },
          });
          if (!user) throw new InternalServerErrorException('Failed to create user');
        } else {
          throw error;
        }
      }
    } else {
      // Update profile info from Telegram
      user = await this.prisma.user.update({
        where: { telegramId },
        data: {
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          username: telegramUser.username,
          photoUrl: telegramUser.photo_url,
        },
        include: { wallet: true },
      });
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('គណនីរបស់អ្នកត្រូវបានហាម');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('គណនីរបស់អ្នកត្រូវបានផ្អាក');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      telegramId: user.telegramId,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        balance: user.wallet?.balance ?? 0,
        currency: user.wallet?.currency ?? 'USD',
      },
    };
  }

  /**
   * Admin login — separate auth from Telegram flow
   */
  async adminLogin(username: string, password: string): Promise<{ accessToken: string; admin: object }> {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin || !admin.isActive) {
      // Use consistent timing to prevent username enumeration
      await bcrypt.compare(password, '$2b$12$invalidhashfortimingprotection000000000000000');
      throw new UnauthorizedException('Username or password incorrect');
    }

    const passwordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Username or password incorrect');
    }

    // Update last login
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.jwtService.sign(
      {
        sub: admin.id,
        username: admin.username,
        role: admin.role,
      },
      {
        secret: this.configService.get<string>('ADMIN_JWT_SECRET'),
        expiresIn: this.configService.get<string>('ADMIN_JWT_EXPIRES_IN', '8h'),
      },
    );

    return {
      accessToken,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    };
  }
}
