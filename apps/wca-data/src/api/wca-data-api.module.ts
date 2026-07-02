import { Inject, Injectable, Module, type DynamicModule, type OnModuleDestroy } from '@nestjs/common'
import type { WcaDataEnv } from '../config/env.schema.js'
import type { WcaDataModule } from '../modules/wca-data/wca-data.module.js'
import { HealthController } from './controllers/health.controller.js'
import { OpenApiController } from './controllers/openapi.controller.js'
import { WcaDataController } from './controllers/wca-data.controller.js'
import { WCA_DATA_CLOSE, WCA_DATA_ENV, WCA_DATA_MODULE } from './tokens.js'

type WcaDataClose = () => Promise<void> | void

type WcaDataApiModuleOptions = {
  close?: WcaDataClose
  env: WcaDataEnv
  wcaData: WcaDataModule
}

@Module({})
export class WcaDataApiModule {
  static register(options: WcaDataApiModuleOptions): DynamicModule {
    return {
      controllers: [HealthController, OpenApiController, WcaDataController],
      module: WcaDataApiModule,
      providers: [
        { provide: WCA_DATA_CLOSE, useValue: options.close ?? noopClose },
        { provide: WCA_DATA_ENV, useValue: options.env },
        { provide: WCA_DATA_MODULE, useValue: options.wcaData },
        WcaDataApiResources,
      ],
    }
  }
}

@Injectable()
class WcaDataApiResources implements OnModuleDestroy {
  private closed = false

  constructor(@Inject(WCA_DATA_CLOSE) private readonly closeResources: WcaDataClose) {}

  async onModuleDestroy(): Promise<void> {
    if (this.closed) {
      return
    }

    this.closed = true
    await this.closeResources()
  }
}

async function noopClose(): Promise<void> {}
