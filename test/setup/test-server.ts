import { INestApplication, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';

let app: INestApplication;

export async function createTestApp(): Promise<INestApplication> {
  if (app) {
    return app;
  }

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  return app.init();
}

export async function getTestApp(): Promise<INestApplication> {
  return createTestApp();
}

export const getTestService = async <T>(service: Type<T>) => {
  const app = await getTestApp();
  return app.get<T>(service);
};
