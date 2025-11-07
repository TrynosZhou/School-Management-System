import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

async function run() {
  const email = 'admin@gmail.com';
  const password = 'admin1';
  const role = 'admin';

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  const ds = app.get(DataSource);
  try {
    const users = ds.getRepository(User);
    let user = await users.findOne({ where: { email } });
    const hash = await bcrypt.hash(password, 10);
    if (!user) {
      user = users.create({ email, passwordHash: hash, role: role as any });
      await users.save(user);
      console.log(`Created admin: ${email}`);
    } else {
      user.passwordHash = hash;
      (user as any).role = role;
      await users.save(user);
      console.log(`Updated admin password/role for: ${email}`);
    }
  } catch (e) {
    console.error('Create admin failed', e);
  } finally {
    await app.close();
  }
}

run();
