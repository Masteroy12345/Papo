import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import { CreateTokenDto } from './dto/tokens.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tokens')
@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve supported tokens list' })
  @ApiResponse({ status: 200, description: 'Supported tokens returned successfully.' })
  async getTokens() {
    return this.tokensService.getTokens();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve token details by ID' })
  @ApiResponse({ status: 200, description: 'Token details returned successfully.' })
  @ApiResponse({ status: 404, description: 'Token not found.' })
  async getTokenById(@Param('id', ParseIntPipe) tokenId: number) {
    return this.tokensService.getTokenById(tokenId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new supported token' })
  @ApiResponse({ status: 201, description: 'Token registered successfully.' })
  async createToken(@Body() createTokenDto: CreateTokenDto) {
    return this.tokensService.createToken(createTokenDto);
  }
}
