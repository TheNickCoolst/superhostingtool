import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../lib/prisma';

export class AuthService {
  async register(email: string, username: string, password: string): Promise<{ user: User; token: string }> {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      throw new AppError('User with this email or username already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if this is the first user - make them admin
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: isFirstUser ? 'ADMIN' : 'USER',
        maxServers: isFirstUser ? 999 : 9
      }
    });

    const token = this.generateToken(user);

    return { user, token };
  }

  async hasUsers(): Promise<boolean> {
    const count = await prisma.user.count();
    return count > 0;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = this.generateToken(user);

    return { user, token };
  }

  private generateToken(user: User): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured. Please set JWT_SECRET environment variable.');
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      secret,
      { expiresIn }
    );
  }
}
