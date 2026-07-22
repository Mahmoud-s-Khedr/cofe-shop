import { BadRequestException, NotFoundException } from '@nestjs/common';
import { hash } from 'argon2';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const databaseService = {
    query: jest.fn(),
  };

  const service = new UsersService(databaseService as any);

  const user = { sub: 1, phone: '+22200000001', isAdmin: false };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('returns the user profile', async () => {
      databaseService.query.mockResolvedValue({
        rowCount: 1,
        rows: [{ id: 1, name: 'Alice', phone: '+22200000001', role: 'USER', status: 'ACTIVE' }],
      });

      const result = await service.getMe(user);

      expect(result).toMatchObject({
        user: { id: 1, name: 'Alice', phone: '+22200000001', role: 'USER', status: 'ACTIVE' },
      });
    });

    it('throws NotFoundException when user not found', async () => {
      databaseService.query.mockResolvedValue({ rowCount: 0, rows: [] });

      await expect(service.getMe(user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMe', () => {
    it('throws BadRequestException when nothing to update', async () => {
      await expect(service.updateMe(user, {})).rejects.toThrow(BadRequestException);
    });

    it('updates the name', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 1, name: 'Alice Updated', phone: '+22200000001', role: 'USER', status: 'ACTIVE' }],
        });

      const result = await service.updateMe(user, { name: 'Alice Updated' });

      expect(result).toMatchObject({ user: { name: 'Alice Updated' } });
    });
  });

  describe('changePassword', () => {
    it('throws NotFoundException when user not found', async () => {
      databaseService.query.mockResolvedValue({ rowCount: 0, rows: [] });

      await expect(
        service.changePassword(user, { oldPassword: 'old12345', newPassword: 'newPassword1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when old password is wrong', async () => {
      databaseService.query.mockResolvedValue({
        rowCount: 1,
        rows: [{ password_hash: await hash('correctpassword') }],
      });

      await expect(
        service.changePassword(user, { oldPassword: 'wrongpassword', newPassword: 'newPassword1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
