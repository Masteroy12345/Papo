import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'papo_jwt_super_secret_key_12345!',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { userId: Number(payload.sub || payload.userId) },
    });
    if (!user) {
      throw new UnauthorizedException('User not found or session expired');
    }
    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      kycStatus: user.kycStatus,
    };
  }
}
