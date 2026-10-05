import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';
import { LoginDto } from './login.dto';

describe('认证 DTO 参数校验', () => {
  it('注册：合法手机号+密码通过校验', async () => {
    const dto = new RegisterDto();
    dto.phone = '13800000001';
    dto.password = 'abc123';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('注册：手机号格式错误被拒绝', async () => {
    const dto = new RegisterDto();
    dto.phone = 'abc123456';
    dto.password = 'abc123';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('注册：密码必须同时包含字母和数字', async () => {
    const dto = new RegisterDto();
    dto.phone = '13800000001';
    dto.password = '123456';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('注册：手机号过短被拒绝', async () => {
    const dto = new RegisterDto();
    dto.phone = '138';
    dto.password = 'abc123';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('登录：缺少密码被拒绝', async () => {
    const dto = new LoginDto();
    dto.phone = '13800000001';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('登录：合法输入通过校验', async () => {
    const dto = new LoginDto();
    dto.phone = '13800000001';
    dto.password = 'abc123';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
