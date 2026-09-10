import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExchangeRatesService } from './exchange-rates.service';

/** Authenticated facade for native clients that cannot call the browser widget directly. */
@Controller('api/rates')
@UseGuards(JwtAuthGuard)
export class ExchangeRatesController {
  constructor(private readonly exchangeRates: ExchangeRatesService) {}

  @Get()
  async get(@Query('base') base?: string) {
    return { base: (base || 'EUR').toUpperCase(), rates: await this.exchangeRates.getRates(base || 'EUR') };
  }
}
